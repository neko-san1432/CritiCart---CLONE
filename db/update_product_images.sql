-- Update product images with real, publicly accessible URLs
UPDATE products 
SET image_url = 'https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg'
WHERE name LIKE '%Sony WH-1000XM4%';

UPDATE products 
SET image_url = 'https://m.media-amazon.com/images/I/71WtwEvwuOS._AC_SL1500_.jpg'
WHERE name LIKE '%Instant Pot Duo%';

UPDATE products 
SET image_url = 'https://m.media-amazon.com/images/I/81fwCpiheHL._AC_SL1500_.jpg'
WHERE name LIKE '%LEGO Star Wars%';

UPDATE products 
SET image_url = 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/22d82a91-69d5-4d0f-a892-0fd043b8cc1f/air-zoom-pegasus-38-road-running-shoes-lq7PZZ.png'
WHERE name LIKE '%Nike Air Zoom%';

UPDATE products 
SET image_url = 'https://www.sephora.com/productimages/sku/s2591501-main-zoom.jpg'
WHERE name LIKE '%La Mer%';

UPDATE products 
SET image_url = 'https://www.godiva.com/dw/image/v2/AAKG_PRD/on/demandware.static/-/Sites-godiva-master-catalog-us/default/dw1f6c48f5/product_images/13972.jpg'
WHERE name LIKE '%Godiva%';

UPDATE products 
SET image_url = 'https://m.media-amazon.com/images/I/71LJJrKbezL._AC_SL1500_.jpg'
WHERE name LIKE '%Samsung%QLED%';

UPDATE products 
SET image_url = 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/images/products/primary/368656-01.png'
WHERE name LIKE '%Dyson V15%';

UPDATE products 
SET image_url = 'https://m.media-amazon.com/images/I/61dYrzvBLbL._AC_SL1500_.jpg'
WHERE name LIKE '%Nintendo Switch OLED%';

UPDATE products 
SET image_url = 'https://www.lecreuset.com/dw/image/v2/BBXB_PRD/on/demandware.static/-/Sites-le-creuset-master/default/dwd0c17786/images/cat-tile/LC_Website_2020_CatTile_CookwareDutchOvens.jpg'
WHERE name LIKE '%Le Creuset%'; 