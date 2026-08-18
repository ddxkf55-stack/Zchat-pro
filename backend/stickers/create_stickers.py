import os

stickers = {
    'thumbs_up': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FFD93D"/><path d="M35 55 L45 55 L45 75 L35 75 Z M50 50 L60 40 L65 45 L55 55 L65 55 L60 75 L45 75 L45 55 Z" fill="#333"/></svg>',
    'heart': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 85 L15 50 C5 40 5 25 20 20 C30 17 40 22 50 35 C60 22 70 17 80 20 C95 25 95 40 85 50 Z" fill="#FF4757"/></svg>',
    'fire': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 C50 10 30 35 30 55 C30 70 40 80 50 80 C60 80 70 70 70 55 C70 35 50 10 50 10 Z M50 70 C45 70 42 65 42 60 C42 55 45 50 50 45 C55 50 58 55 58 60 C58 65 55 70 50 70 Z" fill="#FF6B35"/></svg>',
    'laugh': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FFD93D"/><circle cx="35" cy="40" r="5" fill="#333"/><circle cx="65" cy="40" r="5" fill="#333"/><path d="M30 55 Q50 75 70 55" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    'sad': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FFD93D"/><circle cx="35" cy="40" r="5" fill="#333"/><circle cx="65" cy="40" r="5" fill="#333"/><path d="M30 65 Q50 50 70 65" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    'wave': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 50 Q30 30 40 50 Q50 70 60 50 Q70 30 80 50" stroke="#3390ec" stroke-width="8" fill="none" stroke-linecap="round"/></svg>',
    'clap': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="40" width="25" height="35" rx="5" fill="#FFD93D"/><rect x="55" y="40" width="25" height="35" rx="5" fill="#FFD93D"/><path d="M30 50 L70 50" stroke="#333" stroke-width="3"/></svg>',
    'rocket': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L70 40 L70 70 L50 80 L30 70 L30 40 Z" fill="#FF4757"/><circle cx="50" cy="50" r="8" fill="#FFD93D"/><path d="M40 80 L50 95 L60 80" fill="#FF6B35"/></svg>'
}

for name, svg_content in stickers.items():
    filepath = f"{name}.svg"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✅ Created {filepath}")

print("\n All stickers created successfully!")