// Abstract class or interface for Parsers
export interface ResponseParser {
  parse(response: string): any;
}

export class MCQParser implements ResponseParser {
  parse(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        
        if (parsed.reasoning && parsed.final_answer) {
          return {
            question_type: "multiple_choice",
            answer: parsed.final_answer,
            reasoning: parsed.reasoning,
            code: `${parsed.reasoning}\n\n**FINAL ANSWER:** ${parsed.final_answer}`,
            thoughts: [parsed.reasoning],
            final_answer_highlight: parsed.final_answer
          }
        }
      }
    } catch (e) {
      console.log('Failed to parse MCQ JSON, falling back to text parsing')
    }

    // Fallback to old text parsing
    let finalAnswerMatch = response.match(/FINAL ANSWER:\s*option\s+([\d,\s]+)\)\s*(.+?)$/im)

    let answer = "Answer not found"

    if (finalAnswerMatch) {
      const optionNumbers = finalAnswerMatch[1].trim()
      const optionValue = finalAnswerMatch[2].trim()
      answer = `option ${optionNumbers}) ${optionValue}`
    } else {
      finalAnswerMatch = response.match(/FINAL ANSWER:\s*([A-D](?:\s*,\s*[A-D])*)\s*(.*)$/im)

      if (finalAnswerMatch) {
        const firstCapture = finalAnswerMatch[1]
        const secondCapture = finalAnswerMatch[2]

        if (firstCapture.match(/^[A-D](?:\s*,\s*[A-D])*$/i)) {
          const choices = firstCapture.toUpperCase()
          const value = secondCapture ? secondCapture.trim() : ""
          answer = value ? `${choices} ${value}` : choices
        }
      } else {
        finalAnswerMatch = response.match(/FINAL ANSWER:\s*(.+?)$/im)

        if (finalAnswerMatch) {
          answer = finalAnswerMatch[1].trim()
        } else {
          finalAnswerMatch = response.match(/option\s+([\d,\s]+)\)\s*(.*)$/im)

          if (finalAnswerMatch) {
            const optionNumbers = finalAnswerMatch[1].trim()
            const optionValue = finalAnswerMatch[2].trim()
            answer = `option ${optionNumbers}) ${optionValue}`
          }
        }
      }
    }

    let reasoningMatch = response.match(/```reasoning\s*([\s\S]*?)```/)
    
    if (!reasoningMatch) {
      reasoningMatch = response.match(/```markdown\s*([\s\S]*?)```/)
    }

    let actualResponse = response

    actualResponse = actualResponse.replace(/```(?:python|javascript|java|cpp|c|go|rust|typescript|jsx|tsx)[\s\S]*?```/gi, '')

    const promptMarkers = [
      /1\. MULTIPLE CHOICE QUESTIONS[\s\S]*?FINAL ANSWER:/i,
      /RESPONSE FORMATS:[\s\S]*?(?=The question|Question:|FINAL ANSWER:)/i,
      /You are an expert[\s\S]*?(?=The question|Question:|FINAL ANSWER:)/i,
      /🔴 CRITICAL[\s\S]*?(?=```reasoning|FINAL ANSWER:)/i
    ]

    for (const marker of promptMarkers) {
      if (marker.test(actualResponse)) {
        actualResponse = actualResponse.replace(marker, '')
        break
      }
    }

    if (actualResponse.includes('MULTIPLE CHOICE QUESTIONS')) {
      const questionStart = actualResponse.search(/(?:The question|Question:|Options?:|Which|What|How|Why|When|Where)/i)
      if (questionStart > 0) {
        actualResponse = actualResponse.substring(questionStart)
      }
    }

    let reasoning = reasoningMatch ? reasoningMatch[1].trim() : actualResponse.trim()
    
    reasoning = reasoning.replace(/```[\s\S]*?```/g, '').trim()
    
    if (!reasoning || reasoning.length < 10) {
      const betweenMatch = response.match(/```reasoning\s*[\s\S]*?```\s*([\s\S]*?)FINAL ANSWER:/i)
      if (betweenMatch && betweenMatch[1].trim()) {
        reasoning = betweenMatch[1].trim()
      } else {
        reasoning = actualResponse.split('FINAL ANSWER:')[0].trim()
      }
    }

    let formattedCode = actualResponse.trim()
    if (!formattedCode.includes("FINAL ANSWER:")) {
      formattedCode = formattedCode + `\n\n**FINAL ANSWER:** ${answer}`
    }

    return {
      question_type: "multiple_choice",
      answer: answer,
      reasoning: reasoning,
      code: formattedCode,
      thoughts: [reasoning],
      final_answer_highlight: answer
    }
  }
}

export class WebDevParser implements ResponseParser {
  parse(response: string): any {
    let htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i)
    if (!htmlMatch) {
      htmlMatch = response.match(/<html[\s\S]*?<\/html>/i)
    }
    const html = htmlMatch ? htmlMatch[0] : ""

    let css = ""

    if (html) {
      const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
      const cssBlocks = []
      for (const match of styleMatches) {
        if (match[1] && match[1].trim()) {
          cssBlocks.push(match[1].trim())
        }
      }
      if (cssBlocks.length > 0) {
        css = cssBlocks.join('\n\n')
      }
    }

    if (!css && html) {
      const afterHTML = response.substring(response.indexOf('</html>') + 7)
      const afterHTMLTrimmed = afterHTML.trim()

      const cssWithoutMarkdown = afterHTMLTrimmed
        .replace(/^```css\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

      if (cssWithoutMarkdown && !cssWithoutMarkdown.includes('<')) {
        css = cssWithoutMarkdown
      }
    }

    const code = html + (css ? "\n\n" + css : "")

    return {
      question_type: "web_dev",
      code: code,
      html: html,
      css: css,
      thoughts: ["Web development solution generated"],
      explanation: "HTML and CSS code generated"
    }
  }
}

export class PythonParser implements ResponseParser {
  parse(response: string): any {
    // Extract explanation (text before code block)
    const beforeCode = response.split('```python')[0].trim()
    
    // Extract code block
    const codeMatch = response.match(/```python\s*([\s\S]*?)```/)
    const code = codeMatch ? codeMatch[1].trim() : response
    
    // Try to extract structured explanation
    const questionAsksMatch = beforeCode.match(/\*\*Question asks:\*\*\s*(.+?)(?=\n|$)/i)
    // const approachMatch = beforeCode.match(/\*\*Approach:\*\*\s*(.+?)(?=\n|$)/i)
    // const conceptsMatch = beforeCode.match(/\*\*Key concepts:\*\*\s*(.+?)(?=\n|$)/i)
    
    // Fallback to old format
    const conceptMatch = response.match(/Main concept:\s*(.+?)(?=\n|```)/i)
    
    const explanation = beforeCode || (conceptMatch ? conceptMatch[1].trim() : "Python solution")
    
    return {
      question_type: "python",
      code: `${beforeCode}\n\n\`\`\`python\n${code}\n\`\`\``,
      concept: questionAsksMatch ? questionAsksMatch[1].trim() : (conceptMatch ? conceptMatch[1].trim() : "Python solution"),
      thoughts: [explanation],
      explanation: explanation
    }
  }
}

export class CodingParser implements ResponseParser {
  parse(response: string): any {
    console.log('[CodingParser] Parsing response, length:', response.length)
    
    try {
      // Try to parse the entire response as JSON first
      const trimmedResponse = response.trim()
      if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
        console.log('[CodingParser] Response looks like JSON, attempting parse')
        const parsed = JSON.parse(trimmedResponse)
        
        if (parsed.explanation && parsed.language && parsed.code) {
          console.log('[CodingParser] Valid coding JSON found, language:', parsed.language)
          
          // The code might already have actual newlines (not escaped)
          // or it might have escaped newlines - handle both cases
          let code = parsed.code
          
          // If code contains literal \n (escaped), unescape them
          if (code.includes('\\n')) {
            code = code
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\')
          }
          
          console.log('[CodingParser] Code after processing, first 50 chars:', code.substring(0, 50))
          
          // Format for display with explanation and code block
          const formattedCode = `**Explanation:** ${parsed.explanation}\n\n\`\`\`${parsed.language}\n${code}\n\`\`\``
          
          console.log('[CodingParser] Formatted code created successfully')
          
          const result = {
            question_type: "coding",
            language: parsed.language,
            code: formattedCode,
            concept: parsed.explanation,
            thoughts: [parsed.explanation],
            explanation: parsed.explanation
          }
          
          return result
        }
      }
    } catch (e) {
      console.log('[CodingParser] Failed to parse JSON, falling back to text parsing:', e)
    }

    // Fallback to old text parsing
    console.log('[CodingParser] Using fallback text parsing')
    const languageMatch = response.match(/```(\w+)/)
    const language = languageMatch ? languageMatch[1] : 'code'
    
    const codeMatch = response.match(/```\w+\s*([\s\S]*?)```/)
    const code = codeMatch ? codeMatch[1].trim() : response
    
    let beforeCode = ''
    let explanation = `${language} solution`
    
    if (codeMatch) {
      const codeBlockStart = response.indexOf('```')
      beforeCode = response.substring(0, codeBlockStart).trim()
      
      const explanationMatch = beforeCode.match(/\*\*Explanation:\*\*\s*([\s\S]*?)$/i)
      if (explanationMatch) {
        explanation = explanationMatch[1].trim()
      } else if (beforeCode) {
        explanation = beforeCode
      }
    }
    
    const formattedCode = beforeCode 
      ? `${beforeCode}\n\n\`\`\`${language}\n${code}\n\`\`\``
      : `\`\`\`${language}\n${code}\n\`\`\``
    
    return {
      question_type: "coding",
      language: language,
      code: formattedCode,
      concept: explanation,
      thoughts: [explanation],
      explanation: explanation
    }
  }
}

export class TextParser implements ResponseParser {
  parse(response: string): any {
    const textMatch = response.match(/```text\s*([\s\S]*?)```/)
    const text = textMatch ? textMatch[1].trim() : response

    return {
      question_type: "text",
      code: text,
      thoughts: [text],
      explanation: text
    }
  }
}
