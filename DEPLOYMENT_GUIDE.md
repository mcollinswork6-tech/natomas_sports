# Natomas Sports Association — Domain & Free Hosting Deployment Guide

This guide provides step-by-step instructions to host your static website for **free** with automatic SSL (https://), and connect your GoDaddy domain: **`natomassportsassociation.org`**.

---

## Quick Local Preview on Mac

To view your new website right now on your computer:
1. Open Terminal in this folder:
   ```bash
   cd "/Users/matthewcollins/Documents/Natomas Sports"
   ```
2. Start the built-in Python web server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

You can also simply double-click [index.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/index.html) to open it in Safari or Chrome.

---

## Recommended Free Static Hosting Options

All three options below are 100% free, provide lightning-fast global CDN speeds, include free auto-renewing SSL certificates, and easily connect to GoDaddy.

### Option A: Cloudflare Pages (Recommended - Fastest & Easiest)
1. Sign up for a free account at [cloudflare.com](https://www.cloudflare.com).
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
3. Name your project `natomas-sports` and drag-and-drop the files from `/Users/matthewcollins/Documents/Natomas Sports` directly into the web browser!
4. Click **Deploy Site**. Your site will be live immediately on a temporary `*.pages.dev` URL.
5. In your project settings, click **Custom domains** > **Set up a custom domain**.
6. Enter `natomassportsassociation.org` and `www.natomassportsassociation.org`. Cloudflare will provide the exact DNS records to paste into GoDaddy.

---

### Option B: Netlify (Drag & Drop in 30 Seconds)
1. Go to [netlify.com](https://www.netlify.com) and create a free account.
2. In your dashboard, click **Add new site** > **Deploy manually**.
3. Drag the entire `Natomas Sports` folder into the upload box.
4. Go to **Site Configuration** > **Domain management** > **Add a domain**.
5. Enter `natomassportsassociation.org`.
6. Netlify will display the DNS instructions to copy into GoDaddy.

---

### Option C: GitHub Pages
1. Create a free repository on [github.com](https://github.com) named `natomas-sports`.
2. Push your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Natomas Sports Association"
   git branch -M main
   git remote add origin https://github.com/<your-username>/natomas-sports.git
   git push -u origin main
   ```
3. In GitHub: go to **Settings** > **Pages** > Source: `Deploy from branch main / root`.
4. Enter Custom Domain: `natomassportsassociation.org`.

---

## Configuring GoDaddy DNS Records

Once your site is uploaded to your chosen host, configure your GoDaddy DNS:

1. Log into your **GoDaddy Account** and go to **My Products** > **Domains**.
2. Click on **`natomassportsassociation.org`** and select **Manage DNS** (or **DNS Records**).
3. If there are default parking records, edit or replace them with the records provided by your host:

### For Cloudflare Pages or Netlify:
| Type | Name | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `www` | `<your-project>.pages.dev` (or `<your-site>.netlify.app`) | 1/2 Hour (Default) |
| **A** or **CNAME** | `@` | Point to host IP or Cloudflare Nameservers | 1/2 Hour (Default) |

### For GitHub Pages:
| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `185.199.108.153` | 1/2 Hour |
| **A** | `@` | `185.199.109.153` | 1/2 Hour |
| **A** | `@` | `185.199.110.153` | 1/2 Hour |
| **A** | `@` | `185.199.111.153` | 1/2 Hour |
| **CNAME** | `www` | `<your-github-username>.github.io` | 1/2 Hour |

*(DNS propagation typically takes anywhere from 10 minutes to a few hours).*

---

## Website Architecture & Customization

- [index.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/index.html): Homepage with mission, tryout announcement, travel baseball spotlight, and community signup.
- [travel-baseball.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/travel-baseball.html): Dedicated travel baseball page with 9U–14U divisions, tournament details, and training schedule.
- [programs.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/programs.html): Multi-sport expansion page (Basketball, Soccer, Speed/Agility clinics) and community survey.
- [tryouts.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/tryouts.html): Filterable tryout evaluation dates and full player registration form.
- [about.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/about.html): Organization history, coaching standards, and local business sponsorship packages.
- [contact.html](file:///Users/matthewcollins/Documents/Natomas%20Sports/contact.html): Contact form, field locations (North Natomas Regional Park), and FAQ accordion.
- [assets/images/logo.svg](file:///Users/matthewcollins/Documents/Natomas%20Sports/assets/images/logo.svg): Custom-crafted Natomas Sports Association emblem.
- [assets/css/style.css](file:///Users/matthewcollins/Documents/Natomas%20Sports/assets/css/style.css): Custom typography, gradients, and athletic card hover effects.
- [assets/js/main.js](file:///Users/matthewcollins/Documents/Natomas%20Sports/assets/js/main.js): Mobile navigation, interactive tryout filters, and form handlers.
