// Shopping Cart System (localStorage based)
const Cart = {
    get() {
        const cart = localStorage.getItem('syfa_cart');
        return cart ? JSON.parse(cart) : [];
    },
    save(cart) {
        localStorage.setItem('syfa_cart', JSON.stringify(cart));
        this.updateBadge();
    },
    add(product, qty = 1) {
        const cart = this.get();
        const existing = cart.find(item => item.code === product.code);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({
                code: product.code,
                name: product.name,
                category: product.category,
                basePrice: product.basePrice,
                size: product.size,
                material: product.material,
                type: product.type,
                qty: qty
            });
        }
        this.save(cart);
        this.showToast(`${product.name} added to cart!`);
    },
    remove(code) {
        let cart = this.get();
        cart = cart.filter(item => item.code !== code);
        this.save(cart);
    },
    updateQty(code, qty) {
        const cart = this.get();
        const item = cart.find(i => i.code === code);
        if (item) {
            item.qty = parseInt(qty) || 1;
            if (item.qty <= 0) {
                this.remove(code);
                return;
            }
        }
        this.save(cart);
    },
    count() {
        return this.get().reduce((sum, item) => sum + item.qty, 0);
    },
    clear() {
        localStorage.removeItem('syfa_cart');
        this.updateBadge();
    },
    updateBadge() {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const count = this.count();
            badge.innerText = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    },
    showToast(message) {
        // Simple elegant toast notification
        let toast = document.getElementById('cart-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cart-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 30px;
                background: #003366;
                color: #D4AF37;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 1050;
                font-weight: 600;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(20px);
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-shopping-cart me-2"></i> ${message}`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
        }, 3000);
    }
};

// Global State
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 24;

// Load Products from JSON or JS fallback script dynamically
async function fetchProducts() {
    if (window.productsData && window.productsData.length > 0) {
        allProducts = window.productsData;
        filteredProducts = allProducts;
        return allProducts;
    }
    
    // If running locally via file:// protocol, immediately load dynamically to prevent CORS fetch errors
    if (window.location.protocol === 'file:') {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'products/products.js';
            script.onload = () => {
                if (window.productsData) {
                    allProducts = window.productsData;
                    filteredProducts = allProducts;
                    resolve(allProducts);
                } else {
                    resolve([]);
                }
            };
            script.onerror = () => {
                resolve([]);
            };
            document.head.appendChild(script);
        });
    }

    try {
        const response = await fetch('products/products.json');
        if (!response.ok) throw new Error("Failed to load products list.");
        allProducts = await response.json();
        filteredProducts = allProducts;
        return allProducts;
    } catch (err) {
        console.error("Error loading products via fetch, attempting to load dynamically:", err);
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'products/products.js';
            script.onload = () => {
                if (window.productsData) {
                    allProducts = window.productsData;
                    filteredProducts = allProducts;
                    resolve(allProducts);
                } else {
                    resolve([]);
                }
            };
            script.onerror = () => {
                resolve([]);
            };
            document.head.appendChild(script);
        });
    }
}

// Generate placeholder or specific image path
function getProductImage(product) {
    // Check type of product and assign high quality illustrations or placeholders
    // All products are stored under /images/products/ (we don't hotlink random internet images)
    // We can use generic illustrations based on matching product categories
    const cat = product.category.toLowerCase();
    const name = product.name.toLowerCase();
    
    if (cat.includes('screw') || name.includes('screw')) {
        return 'images/products/screws.png';
    } else if (cat.includes('plate') || name.includes('plate')) {
        return 'images/products/plates.png';
    } else if (cat.includes('drill bit') || name.includes('drill bit')) {
        return 'images/products/drill_bits.png';
    } else if (cat.includes('driver') || name.includes('driver')) {
        return 'images/products/drivers.png';
    } else if (cat.includes('forcep') || name.includes('forcep') || cat.includes('clamp')) {
        return 'images/products/trauma_instruments.png';
    }
    return 'images/products/trauma_instruments.png';
}

// Initialize Page specific features
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Update Cart badge on page load
    Cart.updateBadge();
    
    // 2. Setup Back to Top Button
    const btt = document.getElementById('back-to-top');
    if (btt) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btt.classList.add('show');
            } else {
                btt.classList.remove('show');
            }
        });
        btt.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Determine current page and initialize specific elements
    const path = window.location.pathname;
    const pageName = path.substring(path.lastIndexOf('/') + 1);

    if (pageName === 'instruments.html' || pageName === 'instruments') {
        await initCatalog();
    } else if (pageName === 'order.html' || pageName === 'order') {
        await initOrderPage();
    } else if (pageName === 'index.html' || pageName === '' || pageName === 'index') {
        await initHomePage();
    }
});

// Home Page specific features
async function initHomePage() {
    // Optimization: Do not fetch or load 7,000+ products on home page load (they are not used or displayed here)
}

function renderFeaturedCategories() {
    // Simply render count of items in categories to show under categories section
    const counts = {};
    allProducts.forEach(p => {
        counts[p.category] = (counts[p.category] || 0) + 1;
    });
    // We can show top categories or standard categories
}

// Catalog Page initialization and processing
async function initCatalog() {
    const loader = document.getElementById('catalog-loader');
    if (loader) loader.style.display = 'block';

    await fetchProducts();
    
    if (loader) loader.style.display = 'none';
    
    // Setup filters in UI
    populateCategoryFilters();
    
    // Setup Search Event Listener
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilters();
        });
    }
    
    // Setup Search Button Event Listener
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            applyFilters();
        });
    }

    // Handle incoming URL parameters (category redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const catQuery = urlParams.get('category');
    if (catQuery) {
        selectCategoryByQuery(catQuery);
    } else {
        renderCatalogPage(1);
    }
}

function populateCategoryFilters() {
    const filterContainer = document.getElementById('category-filter-list');
    if (!filterContainer) return;
    
    // Extract unique categories
    const categories = [...new Set(allProducts.map(p => p.category))].sort();
    
    let html = `
        <div class="form-check filter-option">
            <input class="form-check-input category-checkbox" type="checkbox" value="all" id="cat-all" checked>
            <label class="form-check-label" for="cat-all">All Categories</label>
        </div>
    `;
    
    categories.forEach((cat, idx) => {
        html += `
            <div class="form-check filter-option">
                <input class="form-check-input category-checkbox" type="checkbox" value="${cat}" id="cat-${idx}">
                <label class="form-check-label" for="cat-${idx}">${cat}</label>
            </div>
        `;
    });
    
    filterContainer.innerHTML = html;

    // Attach listeners
    const checkboxes = document.querySelectorAll('.category-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'all' && e.target.checked) {
                // Uncheck others
                checkboxes.forEach(other => {
                    if (other.value !== 'all') other.checked = false;
                });
            } else if (e.target.checked) {
                // Uncheck 'all'
                document.getElementById('cat-all').checked = false;
            }
            
            // If nothing checked, check 'all'
            const anyChecked = [...checkboxes].some(c => c.checked);
            if (!anyChecked) {
                document.getElementById('cat-all').checked = true;
            }
            
            applyFilters();
        });
    });
}

function applyFilters() {
    const searchVal = document.getElementById('catalog-search')?.value.toLowerCase() || "";
    
    // Get checked categories
    const checkedCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const checkedCats = [...checkedCheckboxes].map(cb => cb.value);
    
    filteredProducts = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.code.toLowerCase().includes(searchVal);
        
        let matchesCategory = false;
        if (checkedCats.includes('all')) {
            matchesCategory = true;
        } else {
            matchesCategory = checkedCats.includes(p.category);
        }
        
        return matchesSearch && matchesCategory;
    });
    
    renderCatalogPage(1);
}

function selectCategoryByQuery(query) {
    const checkboxes = document.querySelectorAll('.category-checkbox');
    if (checkboxes.length === 0) return;
    
    const queryLower = query.toLowerCase();
    
    // Determine mapping keywords
    let keywords = [queryLower];
    if (queryLower === 'screws') {
        keywords = ['screw'];
    } else if (queryLower === 'plates') {
        keywords = ['plate'];
    } else if (queryLower === 'drill' || queryLower === 'drill bits') {
        keywords = ['drill'];
    } else if (queryLower === 'instruments') {
        keywords = ['instrument', 'driver', 'hammer', 'gauge', 'forcep', 'clamp'];
    } else if (queryLower === 'nails') {
        keywords = ['nail', 'end cap'];
    } else if (queryLower === 'containers') {
        keywords = ['container'];
    }
    
    let matchedAny = false;
    checkboxes.forEach(cb => {
        if (cb.value === 'all') {
            cb.checked = false;
            return;
        }
        
        const valLower = cb.value.toLowerCase();
        const matches = keywords.some(keyword => valLower.includes(keyword));
        if (matches) {
            cb.checked = true;
            matchedAny = true;
        } else {
            cb.checked = false;
        }
    });
    
    // If no match found, check 'all'
    if (!matchedAny) {
        const catAll = document.getElementById('cat-all');
        if (catAll) catAll.checked = true;
    }
    
    applyFilters();
}

function renderCatalogPage(page) {
    currentPage = page;
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5"><h4 class="text-muted">No products found matching your search.</h4></div>`;
        renderPagination(0);
        return;
    }
    
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, filteredProducts.length);
    const pageItems = filteredProducts.slice(startIdx, endIdx);
    
    let html = "";
    pageItems.forEach(product => {
        const isPriceAvailable = product.basePrice !== null && product.basePrice > 0;
        let basePriceHtml = "";
        let sellingPriceHtml = "";
        if (isPriceAvailable) {
            const sellingPrice = (product.basePrice * 1.05).toFixed(2);
            basePriceHtml = `Dealer: ₹${product.basePrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            sellingPriceHtml = `₹${parseFloat(sellingPrice).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        } else {
            basePriceHtml = `Dealer: Price on Request`;
            sellingPriceHtml = `Contact for Quote`;
        }
        
        const imgPath = getProductImage(product);
        const sizeInfo = product.size ? `Size: ${product.size}` : `Material: ${product.material || "Steel"}`;
        
        html += `
            <div class="col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="product-card">
                    <div class="product-img-wrapper">
                        <span class="product-badge">${product.type}</span>
                        <img src="${imgPath}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <span class="product-code">${product.code}</span>
                        <h5 class="product-title" title="${product.name}">${product.name}</h5>
                        <div class="product-meta">${sizeInfo}</div>
                        <div class="price-box d-flex flex-column mb-3">
                            <span class="base-price">${basePriceHtml}</span>
                            <span class="selling-price">${sellingPriceHtml}</span>
                        </div>
                        <div class="d-grid gap-2 d-flex">
                            <button class="btn btn-primary-custom flex-grow-1" onclick='addToCart(${JSON.stringify(product)})'>
                                <i class="fas fa-cart-plus me-1"></i> Add
                            </button>
                            <button class="btn btn-outline-secondary" onclick='showProductDetails(${JSON.stringify(product)})'>
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    renderPagination(filteredProducts.length);
}

function renderPagination(totalItems) {
    const nav = document.getElementById('catalog-pagination');
    if (!nav) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        nav.innerHTML = "";
        return;
    }
    
    let html = `<ul class="pagination justify-content-center">`;
    
    // Prev Button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page Numbers (limited to 5 page tabs for clean UI)
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    // Next Button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    html += `</ul>`;
    nav.innerHTML = html;
}

// Global functions attached to window so onclick matches can find them
window.changePage = function(page) {
    renderCatalogPage(page);
    window.scrollTo({ top: 250, behavior: 'smooth' });
};

window.addToCart = function(product) {
    Cart.add(product, 1);
};

window.showProductDetails = function(product) {
    const modalTitle = document.getElementById('detailsModalLabel');
    const modalBody = document.getElementById('detailsModalBody');
    
    if (!modalTitle || !modalBody) return;
    
    const isPriceAvailable = product.basePrice !== null && product.basePrice > 0;
    let basePriceHtml = "";
    let sellingPriceHtml = "";
    if (isPriceAvailable) {
        const sellingPrice = (product.basePrice * 1.05).toFixed(2);
        basePriceHtml = `₹${product.basePrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        sellingPriceHtml = `₹${parseFloat(sellingPrice).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    } else {
        basePriceHtml = `Price on Request`;
        sellingPriceHtml = `Contact for Quote`;
    }
    
    const imgPath = getProductImage(product);
    
    modalTitle.innerText = product.code;
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-5 mb-3 mb-md-0 text-center bg-light p-3 rounded">
                <img src="${imgPath}" alt="${product.name}" class="img-fluid" style="max-height: 250px; object-fit: contain;">
            </div>
            <div class="col-md-7">
                <h4 class="mb-2" style="color: var(--primary-color);">${product.name}</h4>
                <p class="text-muted mb-3"><strong>Category:</strong> ${product.category}</p>
                
                <table class="table table-bordered mb-4">
                    <tr>
                        <th>Product Code</th>
                        <td>${product.code}</td>
                    </tr>
                    <tr>
                        <th>Size</th>
                        <td>${product.size || "Standard Size"}</td>
                    </tr>
                    <tr>
                        <th>Material</th>
                        <td>${product.material || "Surgical Steel / Titanium"}</td>
                    </tr>
                    <tr>
                        <th>Base Price</th>
                        <td>${basePriceHtml}</td>
                    </tr>
                    <tr class="table-success">
                        <th>Selling Price (Incl. 5% Markup)</th>
                        <td><strong class="text-success" style="font-size: 1.2rem;">${sellingPriceHtml}</strong></td>
                    </tr>
                </table>
                <div class="d-grid">
                    <button class="btn btn-primary-custom" onclick='addToCart(${JSON.stringify(product)}); bootstrap.Modal.getInstance(document.getElementById("detailsModal")).hide();'>
                        <i class="fas fa-cart-plus me-2"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const myModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    myModal.show();
};

// Order Page Initialization
async function initOrderPage() {
    renderCartTable();
    
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            placeOrder();
        });
    }
}

function renderCartTable() {
    const tbody = document.getElementById('cart-items-body');
    const emptyMsg = document.getElementById('cart-empty-msg');
    const tableContainer = document.getElementById('cart-table-container');
    const orderFormCard = document.getElementById('order-form-card');
    
    if (!tbody) return;
    
    const cart = Cart.get();
    
    if (cart.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        if (orderFormCard) orderFormCard.style.display = 'none';
        
        // Reset pricing summary values to zero
        const subtotalEl = document.getElementById('cart-subtotal');
        const gstEl = document.getElementById('cart-gst');
        const grandTotalEl = document.getElementById('cart-grand-total');
        if (subtotalEl) subtotalEl.innerText = "₹0.00";
        if (gstEl) gstEl.innerText = "₹0.00";
        if (grandTotalEl) grandTotalEl.innerText = "₹0.00";
        
        // Hide summary card
        const summaryCard = document.getElementById('cart-summary-card');
        if (summaryCard) summaryCard.style.display = 'none';
        
        return;
    }
    
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    if (orderFormCard) orderFormCard.style.display = 'block';
    
    // Ensure summary card is visible
    const summaryCard = document.getElementById('cart-summary-card');
    if (summaryCard) summaryCard.style.display = 'block';
    
    let html = "";
    let subtotalVal = 0.0;
    
    cart.forEach(item => {
        const isPriceAvailable = item.basePrice !== null && item.basePrice > 0;
        let sellingPriceHtml = "";
        let totalHtml = "";
        if (isPriceAvailable) {
            const sellingPrice = item.basePrice * 1.05;
            const total = sellingPrice * item.qty;
            subtotalVal += total;
            sellingPriceHtml = `₹${sellingPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            totalHtml = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        } else {
            sellingPriceHtml = "On Request";
            totalHtml = "On Request";
        }
        
        html += `
            <tr id="cart-row-${item.code}">
                <td>
                    <div class="fw-bold text-primary">${item.name}</div>
                    <div class="text-muted small">Code: ${item.code} | Size: ${item.size || "Standard"}</div>
                </td>
                <td class="text-nowrap">${sellingPriceHtml}</td>
                <td>
                    <div class="qty-input-wrapper">
                        <button class="qty-btn" onclick="updateCartQty('${item.code}', ${item.qty - 1})">-</button>
                        <input class="qty-val" type="text" value="${item.qty}" readonly>
                        <button class="qty-btn" onclick="updateCartQty('${item.code}', ${item.qty + 1})">+</button>
                    </div>
                </td>
                <td class="text-nowrap">${totalHtml}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="removeFromCartPage('${item.code}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Update Totals
    const subtotalEl = document.getElementById('cart-subtotal');
    const gstEl = document.getElementById('cart-gst');
    const grandTotalEl = document.getElementById('cart-grand-total');
    
    if (subtotalVal > 0) {
        const gstVal = subtotalVal * 0.05;
        const finalGrandTotal = subtotalVal + gstVal;
        
        if (subtotalEl) subtotalEl.innerText = `₹${subtotalVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        if (gstEl) gstEl.innerText = `₹${gstVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        if (grandTotalEl) grandTotalEl.innerText = `₹${finalGrandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    } else {
        if (subtotalEl) subtotalEl.innerText = "Price on Request";
        if (gstEl) gstEl.innerText = "On Request";
        if (grandTotalEl) grandTotalEl.innerText = "Price on Request";
    }
}

window.updateCartQty = function(code, qty) {
    Cart.updateQty(code, qty);
    renderCartTable();
};

window.removeFromCartPage = function(code) {
    Cart.remove(code);
    renderCartTable();
};

// Placing the order via WhatsApp Web/App
function placeOrder() {
    const doctor = document.getElementById('doctor-name').value.trim();
    const mobile = document.getElementById('customer-mobile').value.trim();
    const hospital = document.getElementById('hospital-name').value.trim();
    const city = document.getElementById('customer-city').value.trim();
    
    const cart = Cart.get();
    
    if (cart.length === 0) {
        alert("Your cart is empty! Please add products before checking out.");
        return;
    }
    
    if (!doctor || !mobile || !hospital || !city) {
        alert("Please fill in all details before placing the order.");
        return;
    }
    
    // Format products list
    let productsText = "";
    let subtotalVal = 0.0;
    
    cart.forEach((item, index) => {
        const isPriceAvailable = item.basePrice !== null && item.basePrice > 0;
        if (isPriceAvailable) {
            const sellingPrice = item.basePrice * 1.05;
            const total = sellingPrice * item.qty;
            subtotalVal += total;
            productsText += `${index + 1}. [${item.code}] ${item.name}\n   Qty: ${item.qty} | Price: ₹${sellingPrice.toFixed(2)} | Subtotal: ₹${total.toFixed(2)}\n`;
        } else {
            productsText += `${index + 1}. [${item.code}] ${item.name}\n   Qty: ${item.qty} | Price: On Request | Subtotal: On Request\n`;
        }
    });
    
    // Calculate GST and Grand Total
    const gstVal = subtotalVal * 0.05;
    const finalGrandTotal = subtotalVal + gstVal;
    
    const subtotalStr = subtotalVal > 0 ? `₹${subtotalVal.toFixed(2)}` : "Price on Request";
    const gstStr = subtotalVal > 0 ? `₹${gstVal.toFixed(2)}` : "On Request";
    const grandTotalStr = subtotalVal > 0 ? `₹${finalGrandTotal.toFixed(2)}` : "Price on Request";
    
    // Format WhatsApp message
    const whatsappNumber = "918778628246"; // Prefixing 91 for India country code
    const formattedMsg = `--------------------------------
SYFA ENTERPRISES NEW ORDER

Doctor Name:
${doctor}

Mobile Number:
${mobile}

Hospital Name:
${hospital}

City:
${city}

Ordered Products:
${productsText}
Subtotal (Incl. Markup):
${subtotalStr}

GST (5%):
${gstStr}

Grand Total:
${grandTotalStr}
--------------------------------`;

    const encodedMsg = encodeURIComponent(formattedMsg);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMsg}`;
    
    // Save order details to window object for PDF generation
    window.lastOrderDetails = {
        doctor,
        mobile,
        hospital,
        city,
        cart,
        subtotalStr,
        gstStr,
        grandTotalStr
    };
    
    // Clear cart upon order placement
    Cart.clear();
    
    // Show order success page with options
    showOrderSuccessPage(whatsappUrl);
}

function showOrderSuccessPage(whatsappUrl) {
    const container = document.getElementById('order-main-container');
    if (!container) return;
    
    const details = window.lastOrderDetails;
    
    // Create a beautiful Success Card using bootstrap
    container.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8 text-center py-5">
                <div class="card border-0 shadow p-5 rounded-4 bg-white">
                    <div class="mb-4 text-success">
                        <i class="fas fa-check-circle fa-5x"></i>
                    </div>
                    <h2 class="mb-3 text-primary" style="font-weight: 800;">Order Processed!</h2>
                    <p class="lead text-muted mb-4">
                        Quotation and reference prepared for <strong>Dr. ${details.doctor}</strong>.
                    </p>
                    
                    <div class="alert alert-info text-start p-4 mb-4 rounded-3 border-0 bg-light">
                        <h5 class="alert-heading text-primary" style="font-weight: 700;"><i class="fas fa-receipt me-2"></i>What's Next?</h5>
                        <ol class="mb-0 ps-3 text-muted">
                            <li class="mb-2">Download the **PDF Quotation Bill** for your local records.</li>
                            <li>Click **Send to WhatsApp** to transmit the order directly to SYFA Enterprises for processing.</li>
                        </ol>
                    </div>
                    
                    <div class="d-grid gap-3 d-sm-flex justify-content-center mt-2">
                        <button class="btn btn-outline-primary btn-lg px-4 py-3" onclick="downloadPDFBill()">
                            <i class="fas fa-file-pdf me-2"></i> Download PDF Bill
                        </button>
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-success btn-lg px-4 py-3" id="whatsapp-send-btn">
                            <i class="fab fa-whatsapp me-2"></i> Send to WhatsApp
                        </a>
                    </div>
                    
                    <div class="mt-5">
                        <a href="instruments.html" class="btn btn-link text-decoration-none text-muted fw-bold">
                            <i class="fas fa-arrow-left me-2"></i> Back to Catalog
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Scroll to success card top
    window.scrollTo({ top: 150, behavior: 'smooth' });
}

window.downloadPDFBill = async function() {
    const details = window.lastOrderDetails;
    if (!details) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Helper to load image
    const loadImg = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    };
    
    const logoImg = await loadImg('images/logo.png');
    
    // Page margins and setup
    const margin = 14;
    const pageWidth = 210;
    
    // Primary Header background (#003366)
    doc.setFillColor(0, 51, 102); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Add Logo
    if (logoImg) {
        doc.addImage(logoImg, 'PNG', margin, 7, 24, 24);
    }
    
    // Company Details (Shifted right to account for logo)
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SYFA ENTERPRISES", margin + 28, 18);
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text("Precision Orthopaedic Implants & Surgical Instruments", margin + 28, 24);
    doc.setFont("Helvetica", "italic");
    doc.text("GSTIN: 33ZAKIR08778H", margin + 28, 29);
    
    // Contact Info on Right Header
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Proprietor: S Zakir Hussain", 120, 11);
    doc.text("Email: jagirguru1001@gmail.com", 120, 15);
    doc.text("Phone: +91 8778628246", 120, 19);
    doc.text("Address: 61, First Floor, Palayam Bazaar,", 120, 23);
    doc.text("Woraiyur, Trichy - 620003, Tamil Nadu", 120, 27);
    
    // Website details
    let siteUrl = window.location.origin;
    if (siteUrl.startsWith('file:')) {
        siteUrl = "www.syfaenterprises.com";
    } else {
        siteUrl = siteUrl.replace(/^https?:\/\//, '');
    }
    doc.text(`Website: ${siteUrl}`, 120, 31);
    
    // Gold Accent Line (#d4af37)
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 40, pageWidth, 2, 'F');
    
    // Invoice Title
    doc.setTextColor(0, 51, 102); // Primary color
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("OFFICIAL ESTIMATE / PROFORMA INVOICE", margin, 54);
    
    // Metadata block (Invoice # & Date)
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });
    const invoiceNum = "SYFA-" + Math.floor(1000 + Math.random() * 9000);
    doc.text(`Invoice No: ${invoiceNum}`, margin, 61);
    doc.text(`Date: ${dateStr}`, margin, 66);
    
    // Billing Details Box
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, 72, 182, 34, 'F');
    // Draw thin gray border
    doc.setDrawColor(220, 224, 230);
    doc.rect(margin, 72, 182, 34, 'D');
    
    doc.setTextColor(0, 51, 102);
    doc.setFont("Helvetica", "bold");
    doc.text("Customer & Delivery Details:", margin + 5, 78);
    doc.setTextColor(33, 37, 41);
    doc.setFont("Helvetica", "normal");
    doc.text(`Doctor Name: Dr. ${details.doctor}`, margin + 5, 84);
    doc.text(`Hospital Name: ${details.hospital}`, margin + 5, 90);
    doc.text(`City / Location: ${details.city}`, margin + 5, 96);
    doc.text(`Contact Number: ${details.mobile}`, margin + 5, 102);
    
    // Items Table Header
    let y = 114;
    doc.setFillColor(0, 51, 102);
    doc.rect(margin, y, 182, 9, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.text("S.No", margin + 3, y + 6);
    doc.text("Item Code & Description", margin + 15, y + 6);
    doc.text("Qty", margin + 115, y + 6);
    doc.text("Unit Price", margin + 135, y + 6);
    doc.text("Total", margin + 160, y + 6);
    
    // Table Rows
    y += 15;
    
    details.cart.forEach((item, index) => {
        // Alternating row background for premium look (adjusted height for multi-line content)
        if (index % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y - 6, 182, 12, 'F');
        }
        
        doc.setTextColor(50, 50, 50);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`${index + 1}`, margin + 3, y);
        
        // Wrap text to avoid long item name spill
        let itemName = item.name;
        if (itemName.length > 50) {
            itemName = itemName.substring(0, 48) + "...";
        }
        doc.text(`[${item.code}] ${itemName}`, margin + 15, y);
        
        // Render size & material specifications below description
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        const sizeVal = item.size || "Standard Size";
        const matVal = item.material || "Surgical Steel / Titanium";
        doc.text(`Size: ${sizeVal}   |   Material: ${matVal}`, margin + 15, y + 4.5);
        
        // Restore styling for qty and price columns
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(`${item.qty}`, margin + 115, y);
        
        const isPriceAvailable = item.basePrice !== null && item.basePrice > 0;
        if (isPriceAvailable) {
            const sellingPrice = item.basePrice * 1.05;
            const itemTotal = sellingPrice * item.qty;
            doc.text(`Rs. ${sellingPrice.toFixed(2)}`, margin + 135, y);
            doc.text(`Rs. ${itemTotal.toFixed(2)}`, margin + 160, y);
        } else {
            doc.text("On Request", margin + 135, y);
            doc.text("On Request", margin + 160, y);
        }
        
        y += 12;
        
        // Page break if too many items
        if (y > 270) {
            doc.addPage();
            y = 25;
        }
    });
    
    // Draw table bottom border
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y - 6, margin + 182, y - 6);
    y += 2;
    
    // Totals Box (Right aligned)
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal (Incl. Markup):", margin + 95, y);
    doc.setFont("Helvetica", "normal");
    doc.text(details.subtotalStr, margin + 155, y);
    
    y += 6;
    doc.setFont("Helvetica", "bold");
    doc.text("GST (5%):", margin + 95, y);
    doc.setFont("Helvetica", "normal");
    doc.text(details.gstStr, margin + 155, y);
    
    y += 6;
    // Draw premium blue highlighted box for Grand Total
    doc.setFillColor(230, 240, 255);
    doc.rect(margin + 90, y - 4, 92, 8, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFont("Helvetica", "bold");
    doc.text("Grand Total:", margin + 95, y + 2);
    doc.text(details.grandTotalStr, margin + 155, y + 2);
    
    // Signature block on bottom right
    y += 24;
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("For SYFA Enterprises,", margin + 130, y);
    y += 12;
    doc.line(margin + 130, y, margin + 175, y);
    y += 4;
    doc.text("Authorized Signatory", margin + 132, y);
    
    // Footnote on bottom left
    y += 6;
    doc.setFont("Helvetica", "italic");
    doc.text("* Note: This is an estimated reference bill prepared for your reference.", margin, y - 16);
    doc.text("To place this order, please send the pre-written WhatsApp message on checkout.", margin, y - 12);
    
    // Save PDF
    const filename = `SYFA_Order_${details.doctor.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
};
