# Bootstrap Style & CSS Naming Conventions Update

## Changes Made

The AI has been updated to follow industry-standard practices for HTML/CSS generation:

### 1. ✅ Prefer Bootstrap-Style CSS

The AI now writes Bootstrap-style CSS classes (without using CDN):

```css
/* Container system */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 15px;
}

/* Grid system */
.row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
}

.col {
    flex: 1;
    padding: 0 15px;
}

.col-md-6 {
    flex: 0 0 50%;
    max-width: 50%;
}

/* Buttons */
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

.btn-primary {
    background-color: #007bff;
    color: white;
}

.btn-primary:hover {
    background-color: #0056b3;
}

/* Cards */
.card {
    border: 1px solid #dee2e6;
    border-radius: 4px;
    overflow: hidden;
}

.card-body {
    padding: 20px;
}

.card-title {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
}

/* Navbar */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #343a40;
}

.navbar-brand {
    color: white;
    font-size: 1.25rem;
    text-decoration: none;
}

.nav-link {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    padding: 0.5rem 1rem;
}

.nav-link:hover {
    color: white;
}
```

### 2. ✅ Standard CSS Naming Conventions

The AI now uses industry-standard naming patterns:

#### Bootstrap-Style Names
```html
<div class="container">
    <div class="row">
        <div class="col-md-6">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Title</h5>
                    <p class="card-text">Content</p>
                    <button class="btn btn-primary">Click Me</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### Semantic Names (kebab-case)
```html
<header class="site-header">
    <nav class="main-nav">
        <ul class="nav-list">
            <li class="nav-item">
                <a href="#" class="nav-link">Home</a>
            </li>
        </ul>
    </nav>
</header>

<section class="hero-section">
    <div class="hero-content">
        <h1 class="hero-title">Welcome</h1>
        <p class="hero-subtitle">Subtitle text</p>
    </div>
</section>

<footer class="site-footer">
    <div class="footer-content">
        <p class="footer-text">© 2025</p>
    </div>
</footer>
```

#### BEM-Style (Optional)
```html
<div class="product-card">
    <img class="product-card__image" src="..." alt="...">
    <div class="product-card__body">
        <h3 class="product-card__title">Product Name</h3>
        <p class="product-card__price">$99.99</p>
        <button class="product-card__button product-card__button--primary">
            Buy Now
        </button>
    </div>
</div>
```

### 3. ✅ Check Body Tag for Animation Instructions

The AI now checks the `<body>` tag for additional instructions:

```html
<!-- If existing code has: -->
<body class="fade-in" data-animation="slide-up">
    <!-- Content -->
</body>

<!-- The AI will implement: -->
<style>
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { 
            transform: translateY(20px);
            opacity: 0;
        }
        to { 
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .fade-in {
        animation: fadeIn 1s ease-in;
    }
    
    [data-animation="slide-up"] {
        animation: slideUp 0.6s ease-out;
    }
</style>
```

## What This Means

### Before (Poor Naming):
```html
<div class="box1">
    <div class="thing">
        <h1 class="text1">Title</h1>
        <button class="button1">Click</button>
    </div>
</div>
```

### After (Standard Naming):
```html
<div class="container">
    <div class="card">
        <h1 class="card-title">Title</h1>
        <button class="btn btn-primary">Click</button>
    </div>
</div>
```

## Common Bootstrap-Style Classes

The AI will now use these standard classes:

### Layout
- `.container` - Fixed-width container
- `.container-fluid` - Full-width container
- `.row` - Flex row
- `.col`, `.col-md-6`, `.col-lg-4` - Grid columns

### Components
- `.btn`, `.btn-primary`, `.btn-secondary` - Buttons
- `.card`, `.card-body`, `.card-title` - Cards
- `.navbar`, `.navbar-brand`, `.nav-link` - Navigation
- `.alert`, `.alert-success`, `.alert-danger` - Alerts
- `.badge`, `.badge-primary` - Badges
- `.modal`, `.modal-dialog`, `.modal-content` - Modals

### Typography
- `.h1`, `.h2`, `.h3` - Heading styles
- `.lead` - Lead paragraph
- `.text-center`, `.text-left`, `.text-right` - Text alignment
- `.text-primary`, `.text-success`, `.text-danger` - Text colors

### Utilities
- `.d-flex`, `.d-block`, `.d-none` - Display utilities
- `.justify-content-center`, `.align-items-center` - Flexbox utilities
- `.m-0`, `.mt-3`, `.mb-4`, `.p-2`, `.px-3` - Spacing utilities
- `.w-100`, `.h-100` - Width/height utilities

## Benefits

✅ **Familiar**: Developers recognize Bootstrap class names
✅ **Consistent**: Standard naming across all generated code
✅ **Maintainable**: Easy to understand and modify
✅ **Professional**: Industry-standard conventions
✅ **Semantic**: Class names describe their purpose
✅ **Scalable**: Easy to extend and customize

## Example: Complete Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
        }
        
        /* Container */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 15px;
        }
        
        /* Navbar */
        .navbar {
            background-color: #343a40;
            padding: 1rem 0;
        }
        
        .navbar .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .navbar-brand {
            color: white;
            font-size: 1.5rem;
            text-decoration: none;
            font-weight: bold;
        }
        
        .nav-list {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        
        .nav-link {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
        }
        
        .nav-link:hover {
            color: white;
        }
        
        /* Hero Section */
        .hero-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 0;
            text-align: center;
        }
        
        .hero-title {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .hero-subtitle {
            font-size: 1.25rem;
            margin-bottom: 2rem;
        }
        
        /* Buttons */
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background-color: white;
            color: #667eea;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        /* Cards */
        .row {
            display: flex;
            flex-wrap: wrap;
            margin: 0 -15px;
        }
        
        .col-md-4 {
            flex: 0 0 33.333%;
            padding: 0 15px;
            margin-bottom: 30px;
        }
        
        .card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
        }
        
        .card-body {
            padding: 20px;
        }
        
        .card-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .card-text {
            color: #666;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .col-md-4 {
                flex: 0 0 100%;
            }
            
            .hero-title {
                font-size: 2rem;
            }
            
            .nav-list {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <a href="#" class="navbar-brand">Brand</a>
            <ul class="nav-list">
                <li><a href="#" class="nav-link">Home</a></li>
                <li><a href="#" class="nav-link">About</a></li>
                <li><a href="#" class="nav-link">Contact</a></li>
            </ul>
        </div>
    </nav>
    
    <section class="hero-section">
        <div class="container">
            <h1 class="hero-title">Welcome to Our Platform</h1>
            <p class="hero-subtitle">Build amazing things with our tools</p>
            <a href="#" class="btn btn-primary">Get Started</a>
        </div>
    </section>
    
    <section class="features-section" style="padding: 60px 0;">
        <div class="container">
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title">Feature One</h3>
                            <p class="card-text">Description of feature one goes here.</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title">Feature Two</h3>
                            <p class="card-text">Description of feature two goes here.</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title">Feature Three</h3>
                            <p class="card-text">Description of feature three goes here.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</body>
</html>
```

## Summary

The AI now:
- ✅ Uses Bootstrap-style class names (without CDN)
- ✅ Follows industry-standard naming conventions
- ✅ Checks `<body>` tag for animation instructions
- ✅ Generates professional, maintainable code
- ✅ Creates self-contained, offline-ready HTML

Your HTML code will be more professional and easier to work with!
