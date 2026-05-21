# 💸 FinFlow – Smart Expense Tracker

A production-quality, feature-rich personal finance dashboard built with pure HTML, CSS, and Vanilla JavaScript — no backend required.

---

## ✨ Features

### 🔐 Authentication
- Register & login with email/password
- Password strength indicator
- Remember Me (localStorage persistence)
- Session protection on all pages
- One-click Demo Account to explore instantly

### 📊 Dashboard
- Animated summary cards: Income, Expenses, Balance, Savings Rate
- Recent activity feed

### 💰 Transactions
- Add, edit, delete **Income** and **Expense** entries
- Categories: Salary, Freelance, Business, Investment (income) | Food, Transport, Shopping, Bills, Entertainment, Health, Education, Travel (expense)
- Notes support

### 🔍 Search & Filters
- Real-time text search (title, category, notes)
- Filter by: All / Income / Expense / Today / This Week / This Month
- Category dropdown filter
- Custom date range picker
- Clear all filters

### 📈 Charts (Chart.js)
- 🥧 **Pie** – Expenses by category
- 📊 **Bar** – Monthly Income vs Expenses (last 6 months)
- 📉 **Line** – Running balance trend
- 🍩 **Doughnut** – Savings vs Spending ratio

### 🎯 Budget
- Set monthly budget
- Progress bar with color-coded warnings (80% = warning, 100% = exceeded)
- Remaining amount display

### 👤 Profile Management
- Update name, email, currency preference
- Upload profile avatar (preview in sidebar & header)

### ⚙️ Settings
- 🌙 Dark / Light mode toggle with smooth transition
- 💱 Currency selector (₹ INR / $ USD)
- Notification preferences UI
- Reset All Data (with confirmation)

### 📤 Export
- **CSV** – Export visible/filtered transactions
- **PDF** – Full financial summary report with charts data, top categories, transaction history

### 🎨 UI/UX
- Glassmorphism auth pages
- Responsive sidebar with hamburger menu
- Toast notifications
- Confirm dialogs
- Smooth animations
- Dark/light themes with CSS variables
- Mobile-first responsive design (1200, 992, 768, 480px breakpoints)

---

## 🚀 Quick Start

No installation required! Open directly in browser:

```bash
# Option 1: Open index.html directly
open index.html

# Option 2: Use a local server (recommended to avoid CORS)
npx serve .
# or
python -m http.server 8080
```

Then visit `http://localhost:8080`

> **Demo account:** Click "Try Demo Account" on the login page — no registration needed!

---

## 📁 Folder Structure

```
expense-tracker/
├── index.html          # Login page
├── register.html       # Registration page
├── dashboard.html      # Main app dashboard
├── README.md
│
├── css/
│   ├── style.css       # Global styles, buttons, forms
│   ├── auth.css        # Auth pages (glassmorphism)
│   ├── dashboard.css   # Dashboard layout & components
│   ├── themes.css      # Dark/light theme variables
│   └── responsive.css  # Breakpoint overrides
│
├── js/
│   ├── storage.js      # localStorage helpers
│   ├── auth.js         # Demo data seeding
│   ├── app.js          # Main orchestrator
│   ├── dashboard.js    # Summary cards & tx rendering
│   ├── transactions.js # CRUD operations
│   ├── charts.js       # Chart.js initialization
│   ├── filters.js      # Search & filter logic
│   ├── budget.js       # Budget calculations
│   ├── profile.js      # Avatar & profile updates
│   ├── export.js       # CSV & PDF export
│   └── theme.js        # Theme switching
│
└── data/
    └── sample-data.json  # Reference data structure
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure |
| CSS3 + Variables | Styling & theming |
| Vanilla JS (ES6 Modules) | Logic |
| localStorage | Data persistence |
| [Chart.js 4.4](https://chartjs.org) | Interactive charts |
| [jsPDF 2.5](https://github.com/parallax/jsPDF) | PDF export |
| [Font Awesome 6.5](https://fontawesome.com) | Icons |
| Google Fonts (Syne + DM Sans) | Typography |

---

## 💾 Data Structure

All data is stored in `localStorage`:

```json
// Users array
"finflow_users": [{ "id", "name", "email", "password(btoa)", "currency", "avatar", "theme", "budget" }]

// Current session
"finflow_current": "user_id"

// Per-user transactions
"finflow_tx_<userId>": [{ "id", "type", "title", "amount", "category", "date", "notes" }]
```

---

## 🌐 Deployment

Deploy for free on any static host:

- **Netlify**: Drag & drop the folder
- **GitHub Pages**: Push to repo, enable Pages
- **Vercel**: `vercel --prod`

---

## 🔮 Future Improvements

- [ ] Recurring transactions
- [ ] Savings goals with progress tracking
- [ ] PWA (offline support, installable)
- [ ] Backup / Restore JSON
- [ ] AI spending insights (Anthropic API)
- [ ] Multi-account support
- [ ] Currency conversion API
- [ ] Receipt OCR scanning
- [ ] Email reports

---

## 📄 License

MIT – free to use, modify, and distribute.

---

Made with ❤️ using pure frontend technologies.
