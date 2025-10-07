/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "../sdk/ui/components/**/*.{js,ts,jsx,tsx}"
    ],
    presets: [require('../sdk/ui/tailwind-preset.js')],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Avenir Next Rounded', 'sans-serif'],
                heading: ['Avenir Next', 'sans-serif'],
            },
        }
    },
}

