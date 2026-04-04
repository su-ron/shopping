// 网购网站 JavaScript 功能

// 商品数据
const products = [
    {
        id: 1,
        name: 'iPhone 15 Pro Max',
        description: '最新款苹果手机，钛金属设计，A17 Pro芯片',
        price: 9999,
        originalPrice: 10999,
        image: 'https://via.placeholder.com/300x300/007bff/ffffff?text=iPhone+15',
        category: '电子产品',
        stock: 10
    },
    {
        id: 2,
        name: 'MacBook Pro 16"',
        description: 'M3 Max芯片，16英寸Liquid Retina XDR显示屏',
        price: 19999,
        originalPrice: 22999,
        image: 'https://via.placeholder.com/300x300/28a745/ffffff?text=MacBook+Pro',
        category: '电子产品',
        stock: 5
    },
    {
        id: 3,
        name: 'AirPods Pro 2',
        description: '主动降噪，自适应音频，MagSafe充电盒',
        price: 1899,
        originalPrice: 1999,
        image: 'https://via.placeholder.com/300x300/ffc107/000000?text=AirPods+Pro',
        category: '电子产品',
        stock: 50
    },
    {
        id: 4,
        name: 'Nike Air Max 270',
        description: '经典气垫运动鞋，舒适透气，潮流时尚',
        price: 899,
        originalPrice: 1299,
        image: 'https://via.placeholder.com/300x300/dc3545/ffffff?text=Nike+Air+Max',
        category: '运动鞋',
        stock: 30
    },
    {
        id: 5,
        name: 'Sony WH-1000XM5',
        description: '顶级降噪耳机，30小时续航，Hi-Res音质',
        price: 2499,
        originalPrice: 2999,
        image: 'https://via.placeholder.com/300x300/6f42c1/ffffff?text=Sony+XM5',
        category: '电子产品',
        stock: 15
    },
    {
        id: 6,
        name: 'Coach Classic Handbag',
        description: '经典款女士手提包，真皮材质，优雅设计',
        price: 3599,
        originalPrice: 4599,
        image: 'https://via.placeholder.com/300x300/e83e8c/ffffff?text=Coach+Bag',
        category: '箱包',
        stock: 8
    },
    {
        id: 7,
        name: 'iPad Air 5',
        description: '10.9英寸Liquid Retina显示屏，M1芯片支持Apple Pencil',
        price: 4799,
        originalPrice: 5499,
        image: 'https://via.placeholder.com/300x300/20c997/ffffff?text=iPad+Air',
        category: '电子产品',
        stock: 12
    },
    {
        id: 8,
        name: 'Adidas Ultraboost 22',
        description: '专业跑步鞋，Boost中底，透气编织鞋面',
        price: 1299,
        originalPrice: 1699,
        image: 'https://via.placeholder.com/300x300/0dcaf0/000000?text=Ultraboost+22',
        category: '运动鞋',
        stock: 25
    }
];

// 购物车数据
let cart = [];
let currentUser = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    renderProducts();
    updateCartCount();
    
    // 检查用户登录状态
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
});

// 渲染商品列表
function renderProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productGrid.appendChild(productCard);
    });
}

// 创建商品卡片
function createProductCard(product) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-3';
    
    const discount = Math.round((1 - product.price / product.originalPrice) * 100);
    
    col.innerHTML = `
        <div class="product-card fade-in">
            <div class="product-image" style="background-image: url('${product.image}')"></div>
            <div class="position-relative">
                ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
            </div>
            <div class="product-body">
                <h5 class="product-title">${product.name}</h5>
                <p class="product-description">${product.description}</p>
                <div class="product-price">
                    ¥${product.price}
                    ${product.originalPrice > product.price ? `<span class="original-price">¥${product.originalPrice}</span>` : ''}
                </div>
                <div class="mb-2">
                    <small class="text-muted">库存: ${product.stock} 件</small>
                </div>
                <button class="btn btn-primary btn-add-cart" onclick="addToCart(${product.id})" 
                        ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock === 0 ? '暂时缺货' : '加入购物车'}
                </button>
            </div>
        </div>
    `;
    
    return col;
}

// 添加到购物车
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock === 0) {
        showNotification('商品暂时缺货', 'warning');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            showNotification(`${product.name} 数量已更新`, 'success');
        } else {
            showNotification('已达到库存上限', 'warning');
        }
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
        showNotification(`${product.name} 已加入购物车`, 'success');
    }
    
    saveCart();
    updateCartCount();
    
    // 添加动画效果
    animateAddToCart();
}

// 从购物车移除
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
    showNotification('商品已从购物车移除', 'info');
}

// 更新商品数量
function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    const newQuantity = item.quantity + delta;
    
    if (newQuantity > 0 && newQuantity <= product.stock) {
        item.quantity = newQuantity;
        saveCart();
        renderCart();
        updateCartCount();
    } else if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        showNotification('已达到库存上限', 'warning');
    }
}

// 清空购物车
function clearCart() {
    if (cart.length === 0) {
        showNotification('购物车已经是空的', 'info');
        return;
    }
    
    if (confirm('确定要清空购物车吗？')) {
        cart = [];
        saveCart();
        updateCartCount();
        renderCart();
        showNotification('购物车已清空', 'info');
    }
}

// 渲染购物车
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-cart-x fs-1 text-muted"></i>
                <p class="mt-3 text-muted">购物车是空的</p>
            </div>
        `;
        totalPrice.textContent = '0';
        return;
    }
    
    let html = '<div class="row">';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="col-12 mb-3">
                <div class="card">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-2">
                                <img src="${item.image}" alt="${item.name}" class="img-fluid rounded" style="max-height: 60px;">
                            </div>
                            <div class="col-4">
                                <h6 class="mb-1">${item.name}</h6>
                                <small class="text-muted">¥${item.price} x ${item.quantity}</small>
                            </div>
                            <div class="col-3">
                                <div class="input-group input-group-sm">
                                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${item.id}, -1)">-</button>
                                    <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${item.id}, 1)">+</button>
                                </div>
                            </div>
                            <div class="col-2 text-end">
                                <strong>¥${itemTotal}</strong>
                            </div>
                            <div class="col-1">
                                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    cartItems.innerHTML = html;
    totalPrice.textContent = total.toString();
}

// 更新购物车计数
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    
    if (count > 0) {
        cartCount.style.display = 'inline-block';
    } else {
        cartCount.style.display = 'none';
    }
}

// 显示购物车
function showCart() {
    renderCart();
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    cartModal.show();
}

// 显示登录框
function showLogin() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 用户登录
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showNotification('请输入用户名和密码', 'warning');
        return;
    }
    
    // 模拟登录验证
    if (username.length >= 3 && password.length >= 6) {
        currentUser = { username, loginTime: new Date().toISOString() };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showNotification(`欢迎回来, ${username}!`, 'success');
        
        // 关闭登录框
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        // 清空表单
        document.getElementById('loginForm').reset();
        
        // 更新导航栏显示用户名
        updateNavbar();
    } else {
        showNotification('用户名至少3位，密码至少6位', 'error');
    }
}

// 更新导航栏
function updateNavbar() {
    const navbarNav = document.querySelector('.navbar-nav');
    if (currentUser) {
        // 如果有用户信息，替换登录按钮
        const loginButton = navbarNav.querySelector('button[onclick="showLogin()"]');
        if (loginButton) {
            loginButton.outerHTML = `<span class="navbar-text me-2">欢迎, ${currentUser.username}</span>`;
        }
    }
}

// 保存购物车到本地存储
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// 从本地存储加载购物车
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 添加到购物车动画效果
function animateAddToCart() {
    const cartButton = document.querySelector('button[onclick="showCart()"]');
    if (cartButton) {
        cartButton.classList.add('animate-bounce');
        setTimeout(() => {
            cartButton.classList.remove('animate-bounce');
        }, 600);
    }
}

// 添加必要的CSS动画
const style = document.createElement('style');
style.textContent = `
    .animate-bounce {
        animation: bounce 0.6s ease-in-out;
    }
    
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
`;
document.head.appendChild(style);

// 添加Bootstrap Icons
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css';
document.head.appendChild(link);