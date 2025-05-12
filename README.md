# CritiCart - Product Review Platform

CritiCart is a modern web application for submitting and managing product reviews. Built with vanilla HTML, CSS, and JavaScript, it provides a clean and intuitive interface for users to share their experiences with products.

## Features

- User authentication and authorization
- Submit product reviews with images and videos
- Rate products based on price and quality
- Filter and search reviews
- Admin dashboard for review management
- Dark mode support
- Responsive design

## Project Structure

```
criticart/
├── assets/
│   ├── images/      # Product and user images
│   └── icons/       # Application icons
├── components/
│   ├── css/         # Reusable CSS components
│   └── js/          # Reusable JavaScript components
├── css/
│   ├── pages/       # Page-specific styles
│   └── components/  # Component-specific styles
├── js/
│   ├── pages/       # Page-specific scripts
│   ├── components/  # Reusable components
│   └── utils/       # Utility functions
├── index.html
├── reviews.html
├── review.html
├── submit-review.html
├── admin.html
└── README.md
```

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/criticart.git
```

2. Set up Supabase:
   - Create a new Supabase project
   - Set up the following tables:
     - users
     - reviews
     - reports
   - Configure authentication
   - Update the Supabase configuration in `js/auth.js`

3. Configure reCAPTCHA:
   - Get your reCAPTCHA site key from Google
   - Update the reCAPTCHA configuration in the HTML files

4. Start a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

5. Open `http://localhost:8000` in your browser

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Supabase (Backend & Authentication)
- Font Awesome (Icons)
- Google reCAPTCHA

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Your Name - your.email@example.com
Project Link: https://github.com/yourusername/criticart 