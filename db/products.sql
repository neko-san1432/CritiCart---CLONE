-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    shop_provider VARCHAR(100) NOT NULL,
    image_url TEXT,
    product_url TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products
INSERT INTO products (name, description, category, price, shop_provider, image_url, product_url) VALUES
(
    'Sony WH-1000XM4 Wireless Headphones',
    'Industry-leading noise canceling with Dual Noise Sensor technology. Next-level music with Edge-AI, co-developed with Sony Music Studios Tokyo.',
    'Electronics',
    349.99,
    'Amazon',
    'https://example.com/images/sony-headphones.jpg',
    'https://amazon.com/sony-wh1000xm4'
),
(
    'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
    'Seven appliances in one: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer.',
    'Home',
    89.99,
    'Target',
    'https://example.com/images/instant-pot.jpg',
    'https://target.com/instant-pot-duo'
),
(
    'LEGO Star Wars Millennium Falcon',
    'Detailed LEGO brick version of Han Solo's famous Corellian freighter with lots of external details and classic Star Wars characters.',
    'Toys',
    159.99,
    'LEGO Shop',
    'https://example.com/images/lego-falcon.jpg',
    'https://lego.com/star-wars/millennium-falcon'
),
(
    'Nike Air Zoom Pegasus 38',
    'The road running shoe that's good for just about anything with responsive cushioning and breathable mesh.',
    'Fashion',
    119.99,
    'Nike',
    'https://example.com/images/nike-pegasus.jpg',
    'https://nike.com/pegasus-38'
),
(
    'La Mer Moisturizing Cream',
    'Luxury moisturizer that helps heal dryness, soften the look of fine lines and wrinkles, and restore radiance.',
    'Cosmetics',
    190.00,
    'Sephora',
    'https://example.com/images/la-mer.jpg',
    'https://sephora.com/la-mer-cream'
),
(
    'Godiva Signature Truffles Gift Box',
    'Premium chocolate truffles featuring dark, milk, and white chocolate with various gourmet fillings.',
    'Food',
    34.95,
    'Godiva',
    'https://example.com/images/godiva-truffles.jpg',
    'https://godiva.com/signature-truffles'
),
(
    'Samsung 65" QLED 4K Smart TV',
    'Quantum Dot technology delivers Samsung's most realistic picture with optimized color and clarity.',
    'Electronics',
    1299.99,
    'Best Buy',
    'https://example.com/images/samsung-tv.jpg',
    'https://bestbuy.com/samsung-qled'
),
(
    'Dyson V15 Detect Cordless Vacuum',
    'Intelligent cordless vacuum with laser dust detection and particle counting for scientific proof of a deep clean.',
    'Home',
    699.99,
    'Dyson',
    'https://example.com/images/dyson-v15.jpg',
    'https://dyson.com/v15-detect'
),
(
    'Nintendo Switch OLED Model',
    'Enhanced gaming system featuring a vibrant 7-inch OLED screen, wide adjustable stand, and enhanced audio.',
    'Electronics',
    349.99,
    'GameStop',
    'https://example.com/images/switch-oled.jpg',
    'https://gamestop.com/nintendo-switch-oled'
),
(
    'Le Creuset Signature Round Dutch Oven',
    'Enameled cast iron Dutch oven that provides superior heat distribution and retention.',
    'Home',
    399.99,
    'Williams Sonoma',
    'https://example.com/images/le-creuset.jpg',
    'https://williams-sonoma.com/le-creuset'
);

-- Create index for faster category searches
CREATE INDEX idx_products_category ON products(category);

-- Create index for text search
CREATE INDEX idx_products_name_description ON products USING gin(to_tsvector('english', name || ' ' || description));

-- Add Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Products are viewable by everyone"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert products"
    ON products FOR INSERT
    WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Only admins can update products"
    ON products FOR UPDATE
    USING (auth.role() = 'admin');

CREATE POLICY "Only admins can delete products"
    ON products FOR DELETE
    USING (auth.role() = 'admin'); 