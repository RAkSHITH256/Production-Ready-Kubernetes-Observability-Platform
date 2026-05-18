let menu = [];
let cart = [];

// DOM Elements
const menuGrid = document.getElementById('menu-grid');
const cartBtn = document.getElementById('cart-btn');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');

// Fetch Menu
async function fetchMenu() {
    try {
        const response = await fetch('/api/menu');
        menu = await response.json();
        renderMenu();
    } catch (error) {
        menuGrid.innerHTML = '<p>Failed to load menu.</p>';
    }
}

// Render Menu
function renderMenu() {
    menuGrid.innerHTML = '';
    menu.forEach(item => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}" class="food-image">
            <div class="food-info">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <span class="food-price">$${item.price.toFixed(2)}</span>
                <button class="add-btn" onclick="addToCart(${item.id})">Add to Cart</button>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// Cart Logic
window.addToCart = (id) => {
    const item = menu.find(i => i.id === id);
    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    updateCartUI();
};

window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
};

function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = totalItems;
    
    // Update Items List
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        checkoutBtn.disabled = true;
    } else {
        checkoutBtn.disabled = false;
        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div>
                    <strong>${item.name}</strong> x ${item.quantity}<br>
                    <small>$${(item.price * item.quantity).toFixed(2)}</small>
                </div>
                <button onclick="removeFromCart(${item.id})">Remove</button>
            `;
            cartItemsContainer.appendChild(el);
        });
    }

    // Update Total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalPrice.innerText = `$${total.toFixed(2)}`;
}

// Checkout Logic
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;
    
    const orderData = {
        customer_name: 'Guest User',
        items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert(`Order placed successfully! Order ID: ${result.order_id}`);
            cart = [];
            updateCartUI();
            cartOverlay.classList.remove('active');
        } else {
            alert('Failed to place order.');
        }
    } catch (error) {
        alert('An error occurred during checkout.');
    }
});

// Modal Logic
cartBtn.addEventListener('click', () => cartOverlay.classList.add('active'));
closeCartBtn.addEventListener('click', () => cartOverlay.classList.remove('active'));

// Init
fetchMenu();
