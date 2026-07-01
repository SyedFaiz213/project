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
    
    if (cat.includes('nail') || name.includes('nail') || name.includes('blade')) {
        return 'images/products/nails_implants.png';
    } else if (cat.includes('prosthesis') || name.includes('prosthesis') || name.includes('bipolar') || name.includes('stem')) {
        return 'images/products/prosthesis_implants.png';
    } else if (cat.includes('spine') || cat.includes('spinal') || name.includes('cage') || name.includes('pedicle')) {
        return 'images/products/spine_implants.png';
    } else if (cat.includes('arthroscopy') || name.includes('suture disc') || name.includes('endo button') || name.includes('anchor')) {
        return 'images/products/arthroscopy_implants.png';
    } else if (cat.includes('maxillofacial') || cat.includes('cmf') || name.includes('mini ') || name.includes('mandible') || name.includes('tmj') || name.includes('arch bar')) {
        return 'images/products/maxillofacial_implants.png';
    } else if (cat.includes('wire') || cat.includes('pin') || name.includes('steinman') || name.includes('schanz') || name.includes('k-wire')) {
        return 'images/products/wires_pins.png';
    } else if (cat.includes('fixator') || name.includes('clamp') || name.includes('distractor') || name.includes('staple') || name.includes('rail')) {
        return 'images/products/external_fixators.png';
    } else if (cat.includes('screw') || name.includes('screw')) {
        return 'images/products/screws.png';
    } else if (cat.includes('plate') || name.includes('plate')) {
        return 'images/products/plates.png';
    } else if (cat.includes('drill bit') || name.includes('drill bit')) {
        return 'images/products/drill_bits.png';
    } else if (cat.includes('driver') || name.includes('driver')) {
        return 'images/products/drivers.png';
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
    if (queryLower === 'screws' || queryLower === 'bone screws') {
        keywords = ['screw', 'bolt'];
    } else if (queryLower === 'plates' || queryLower === 'bone plates') {
        keywords = ['plate'];
    } else if (queryLower === 'locking' || queryLower === 'locking plates') {
        keywords = ['locking'];
    } else if (queryLower === 'drill' || queryLower === 'drill bits') {
        keywords = ['drill'];
    } else if (queryLower === 'instruments') {
        keywords = ['instrument', 'driver', 'hammer', 'gauge', 'forcep', 'clamp'];
    } else if (queryLower === 'nails' || queryLower === 'nailing') {
        keywords = ['nail', 'blade', 'bolt'];
    } else if (queryLower === 'prosthesis') {
        keywords = ['prosthesis', 'bipolar', 'stem', 'head'];
    } else if (queryLower === 'spine' || queryLower === 'spine implants') {
        keywords = ['spine', 'spinal', 'cage', 'connector', 'rod'];
    } else if (queryLower === 'arthroscopy' || queryLower === 'arthroscopy implants') {
        keywords = ['arthroscopy', 'anchor', 'suture', 'endo button'];
    } else if (queryLower === 'maxillofacial' || queryLower === 'maxillofacial implants') {
        keywords = ['maxillofacial', 'mini', 'mandible', 'tmj', 'arch bar'];
    } else if (queryLower === 'wires' || queryLower === 'pins' || queryLower === 'wire & pins') {
        keywords = ['wire', 'pin', 'schanz'];
    } else if (queryLower === 'fixator' || queryLower === 'fixators' || queryLower === 'external fixators') {
        keywords = ['fixator', 'clamp', 'distractor', 'staples', 'rail'];
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
    let doctorVal = document.getElementById('doctor-name').value.trim();
    // Normalize prefix "Dr. "
    let doctorCleaned = doctorVal.replace(/^(dr\b\.?|dr\.?\s*)/i, '').trim();
    const doctor = doctorCleaned ? "Dr. " + doctorCleaned : "";
    const mobile = document.getElementById('customer-mobile').value.trim();
    const hospital = document.getElementById('hospital-name').value.trim();
    
    // Extract Patient details
    const patientName = document.getElementById('patient-name').value.trim();
    const patientAgeGender = document.getElementById('patient-age-gender').value.trim();
    const patientIPNumber = document.getElementById('patient-ip-number').value.trim();
    
    const cart = Cart.get();
    
    if (cart.length === 0) {
        alert("Your cart is empty! Please add products before checking out.");
        return;
    }
    
    if (!doctor || !mobile || !patientName || !patientAgeGender || !patientIPNumber) {
        alert("Please fill in all required fields marked with * before placing the order.");
        return;
    }
    
    // Generate Auto-Increment Invoice Number
    const currentYear = new Date().getFullYear();
    let invoiceCounter = parseInt(localStorage.getItem('syfa_invoice_counter')) || 1;
    const formattedCounter = String(invoiceCounter).padStart(4, '0');
    const invoiceNum = `SE-${currentYear}-${formattedCounter}`;
    
    // Increment and save counter for next order
    localStorage.setItem('syfa_invoice_counter', invoiceCounter + 1);
    
    // Format products list
    let productsText = "";
    let subtotalVal = 0.0;
    
    cart.forEach((item, index) => {
        const isPriceAvailable = item.basePrice !== null && item.basePrice > 0;
        if (isPriceAvailable) {
            const unitPrice = item.basePrice * 1.05;
            const total = unitPrice * item.qty;
            subtotalVal += total;
            productsText += `${index + 1}. [${item.code}] ${item.name}\n   Qty: ${item.qty} | Price: \u20B9${unitPrice.toFixed(2)} | Subtotal: \u20B9${total.toFixed(2)}\n`;
        } else {
            productsText += `${index + 1}. [${item.code}] ${item.name}\n   Qty: ${item.qty} | Price: On Request | Subtotal: On Request\n`;
        }
    });
    
    // Calculate GST and Grand Total
    const gstVal = subtotalVal * 0.05;
    const finalGrandTotal = subtotalVal + gstVal;
    
    const subtotalStr = subtotalVal > 0 ? `\u20B9${subtotalVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "Price on Request";
    const gstStr = subtotalVal > 0 ? `\u20B9${gstVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "On Request";
    const grandTotalStr = subtotalVal > 0 ? `\u20B9${finalGrandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "Price on Request";
    
    // Save order details to window object for success page reference and PDF generation
    window.lastOrderDetails = {
        invoiceNum,
        dateStr: new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }),
        timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        doctor,
        mobile,
        hospital,
        patientName,
        patientAgeGender,
        patientIPNumber,
        cart,
        subtotalStr,
        gstStr,
        grandTotalStr,
        amountInWords: numberToWords(finalGrandTotal)
    };
    
    // Format WhatsApp message
    const whatsappNumber = "918778628246"; // Prefixing 91 for India country code
    const formattedMsg = `--------------------------------
SYFA ENTERPRISES - NEW ORDER
Invoice No: ${invoiceNum}
Date: ${window.lastOrderDetails.dateStr}

Doctor Name: ${doctor}
Mobile Number: ${mobile}
Hospital Name: ${hospital || "N/A"}

Patient Name: ${patientName}
Patient Age/Gender: ${patientAgeGender}
Patient IP Number: ${patientIPNumber}

Ordered Products:
${productsText}

Subtotal (Incl. Markup): ${subtotalStr}
GST (5%): ${gstStr}
Grand Total: ${grandTotalStr}
--------------------------------`;

    const encodedMsg = encodeURIComponent(formattedMsg);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMsg}`;
    
    // Clear cart upon order placement
    Cart.clear();
    
    // Trigger PDF download automatically
    downloadPDFBill();
    
    // Show order success page with options
    showOrderSuccessPage(whatsappUrl);
}

function showOrderSuccessPage(whatsappUrl) {
    const container = document.getElementById('order-main-container');
    if (!container) return;
    
    const details = window.lastOrderDetails;
    
    container.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8 text-center py-5">
                <div class="card border-0 shadow-lg p-5 rounded-4 bg-white position-relative overflow-hidden">
                    <div class="position-absolute top-0 start-0 w-100" style="height: 6px; background: linear-gradient(90deg, #28a745, #218838);"></div>
                    
                    <div class="mb-4 text-success animate__animated animate__bounceIn">
                        <i class="fas fa-check-circle fa-5x"></i>
                    </div>
                    
                    <h2 class="mb-3 text-primary fw-bold" style="letter-spacing: -0.5px;">Order Sent Successfully</h2>
                    
                    <div class="alert alert-success border-0 shadow-sm p-3 mb-4 rounded-3 text-start bg-success bg-opacity-10 text-success d-flex align-items-center">
                        <i class="fas fa-info-circle fa-lg me-3"></i>
                        <div>
                            <strong class="d-block">Invoice downloaded successfully.</strong>
                            <span class="small text-muted">A PDF invoice has been saved as <code>Invoice.pdf</code>.</span>
                        </div>
                    </div>
                    
                    <p class="lead text-muted mb-4">
                        Quotation and medical reference prepared for <strong>${details.doctor}</strong>.
                    </p>
                    
                    <div class="alert alert-info text-start p-4 mb-4 rounded-3 border-0 bg-light">
                        <h5 class="alert-heading text-primary fw-bold mb-2"><i class="fas fa-receipt me-2"></i>What's Next?</h5>
                        <ol class="mb-0 ps-3 text-muted">
                            <li class="mb-2">Download the **PDF Invoice** for your hospital records (if it didn't auto-download, use the button below).</li>
                            <li>Click **Send to WhatsApp** to submit the quotation to SYFA Enterprises for immediate shipping.</li>
                        </ol>
                    </div>
                    
                    <div class="d-grid gap-3 d-sm-flex justify-content-center mt-2">
                        <button class="btn btn-outline-primary btn-lg px-4 py-3 fw-bold" onclick="downloadPDFBill()">
                            <i class="fas fa-file-pdf me-2"></i> Download PDF Bill
                        </button>
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-success btn-lg px-4 py-3 fw-bold shadow" id="whatsapp-send-btn">
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
    
    window.scrollTo({ top: 150, behavior: 'smooth' });
}

function numberToWords(num) {
    if (num <= 0) return "Price on Request";
    
    const parts = num.toFixed(2).split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]);
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
                  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    function convertSection(n) {
        let str = "";
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + " ";
            n %= 10;
        }
        if (n > 0) {
            str += ones[n] + " ";
        }
        return str.trim();
    }
    
    let words = "";
    let temp = integerPart;
    
    if (temp >= 10000000) {
        words += convertSection(Math.floor(temp / 10000000)) + " Crore ";
        temp %= 10000000;
    }
    if (temp >= 100000) {
        words += convertSection(Math.floor(temp / 100000)) + " Lakh ";
        temp %= 100000;
    }
    if (temp >= 1000) {
        words += convertSection(Math.floor(temp / 1000)) + " Thousand ";
        temp %= 1000;
    }
    if (temp > 0) {
        words += convertSection(temp);
    }
    
    let result = "Rupees " + words.trim();
    
    if (decimalPart > 0) {
        result += " and Paise " + convertSection(decimalPart);
    }
    
    return result + " Only.";
}

window.downloadPDFBill = function() {
    const details = window.lastOrderDetails;
    if (!details) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const logoBase64 = "data:image/jpeg;base64,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";
    
    const margin = 14;
    const pageWidth = 210;
    
    // Top-left Logo
    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin, 8, 22, 22);
    }
    
    // Company information below the logo
    doc.setTextColor(0, 51, 102); // Dark blue primary color
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SYFA ENTERPRISES", margin, 34);
    
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Orthopaedic Implants & Instruments", margin, 38);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(212, 175, 55); // Gold Accent Color
    doc.text("GSTIN: 33AAEPZ9117F1ZJ", margin, 42);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("DL No: TN/TRW/20B/00236, TN/TRW/21B/00236", margin, 46);
    
    // Right-aligned header details (aligned to right margin at pageWidth - margin = 196)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text("SYFA ENTERPRISES", 196, 11, { align: 'right' });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text("61, Palayam Bazaar,", 196, 15, { align: 'right' });
    doc.text("Woraiyur,", 196, 19, { align: 'right' });
    doc.text("Trichy - 620003", 196, 23, { align: 'right' });
    doc.text("Phone: +91 8778628246", 196, 27, { align: 'right' });
    doc.text("Email: jagirguru1001@gmail.com", 196, 31, { align: 'right' });
    
    // Clean Gold separator line (does not bleed to page edge, matches right margin)
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, 50, pageWidth - (margin * 2), 1, 'F');
    
    // Invoice Title
    doc.setTextColor(0, 51, 102); 
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("OFFICIAL TAX INVOICE", margin, 58);
    
    // Dynamic Spacing and Sizing calculation based on item count
    const itemCount = details.cart.length;
    let tablePadding = 3.5;
    let prodPadding = 3;
    let tableFontSize = 8;
    let prodFontSize = 7.5;
    let gap = 8;
    let totalsGap = 6;

    if (itemCount > 12) {
        tablePadding = 1.8;
        prodPadding = 1.5;
        tableFontSize = 6.5;
        prodFontSize = 6;
        gap = 3;
        totalsGap = 3;
    } else if (itemCount > 8) {
        tablePadding = 2.2;
        prodPadding = 2;
        tableFontSize = 7;
        prodFontSize = 6.5;
        gap = 4;
        totalsGap = 4;
    } else if (itemCount > 5) {
        tablePadding = 2.8;
        prodPadding = 2.5;
        tableFontSize = 7.5;
        prodFontSize = 7;
        gap = 6;
        totalsGap = 5;
    }

    // Customer Details Table using jspdf-autotable (Bordered Box)
    doc.autoTable({
        startY: 62,
        theme: 'grid',
        styles: { fontSize: tableFontSize, cellPadding: tablePadding, font: 'Helvetica' },
        bodyStyles: { lineColor: [220, 224, 230], lineWidth: 0.5 },
        body: [
            [
                { content: 'Doctor Name:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250], cellWidth: 28 } },
                { content: details.doctor },
                { content: 'Patient Name:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250], cellWidth: 28 } },
                { content: details.patientName }
            ],
            [
                { content: 'Mobile Number:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: details.mobile },
                { content: 'Age / Gender:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: details.patientAgeGender }
            ],
            [
                { content: 'Hospital Name:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: details.hospital || 'N/A' },
                { content: 'IP Number:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: details.patientIPNumber }
            ],
            [
                { content: 'Invoice Number:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: details.invoiceNum },
                { content: 'Invoice Date / Time:', styles: { fontStyle: 'bold', fillColor: [248, 249, 250] } },
                { content: `${details.dateStr}  ${details.timeStr}` }
            ]
        ],
        margin: { left: margin, right: margin }
    });
    
    // Prepare Products Table Data
    const tableData = details.cart.map((item, index) => {
        const isPriceAvailable = item.basePrice !== null && item.basePrice > 0;
        const unitPrice = isPriceAvailable ? item.basePrice * 1.05 : 0;
        const subtotal = unitPrice * item.qty;
        const gstAmount = subtotal * 0.05;
        const total = subtotal + gstAmount;
        
        return [
            index + 1,
            `[${item.code}] ${item.name} (Size: ${item.size || "Standard"}, Mat: ${item.material || "SS/Titanium"})`,
            item.code, 
            item.qty,
            isPriceAvailable ? `Rs. ${unitPrice.toFixed(2)}` : "On Request",
            "5%",
            isPriceAvailable ? `Rs. ${gstAmount.toFixed(2)}` : "On Request",
            isPriceAvailable ? `Rs. ${total.toFixed(2)}` : "On Request"
        ];
    });
    
    // Draw Products Table using jspdf-autotable
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + gap,
        head: [['S.No', 'Product Name', 'Catalogue Number', 'Quantity', 'Unit Price', 'GST %', 'GST Amount', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: prodFontSize, cellPadding: prodPadding, font: 'Helvetica' },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 68, halign: 'left' },
            2: { cellWidth: 22, halign: 'left' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 11, halign: 'center' },
            6: { cellWidth: 20, halign: 'right' },
            7: { cellWidth: 21, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });
    
    let currentY = doc.lastAutoTable.finalY + gap;
    
    // Helper function to clean currency strings (replaces rupee symbol with Rs. for PDF Helvetica compatibility)
    const cleanPrice = (priceStr) => {
        if (!priceStr) return "";
        return priceStr.replace(/₹/g, 'Rs. ').replace(/â‚¹/g, 'Rs. ').replace(/â¹/g, 'Rs. ');
    };

    // Totals Box (Right aligned at right margin = 196)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal (Incl. Markup):", 140, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(cleanPrice(details.subtotalStr), 196, currentY, { align: 'right' });
    
    currentY += totalsGap;
    doc.setFont("Helvetica", "bold");
    doc.text("GST (5%):", 140, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(cleanPrice(details.gstStr), 196, currentY, { align: 'right' });
    
    currentY += totalsGap;
    // Highlight Box for Grand Total (X = 130 to 196, aligns perfectly with table right border)
    doc.setFillColor(230, 240, 255);
    doc.rect(130, currentY - 4.5, 66, 8.5, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFont("Helvetica", "bold");
    doc.text("Grand Total:", 140, currentY + 1.5);
    doc.text(cleanPrice(details.grandTotalStr), 196, currentY + 1.5, { align: 'right' });
    
    // Amount in Words
    currentY += totalsGap * 1.5;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 37, 41);
    doc.text("Amount in Words:", margin, currentY);
    doc.setFont("Helvetica", "italic");
    doc.text(cleanPrice(details.amountInWords), margin + 28, currentY);
    
    // Dynamic Footer placement to guarantee single A4 page constraint without overlaps
    const bankStartY = Math.max(238, currentY + totalsGap * 2);
    
    // Bank Details Box
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, bankStartY, 98, 30, 'F');
    doc.setDrawColor(220, 224, 230);
    doc.rect(margin, bankStartY, 98, 30, 'D');
    
    doc.setTextColor(0, 51, 102);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("BANK DETAILS:", margin + 4, bankStartY + 5);
    
    doc.setTextColor(50, 50, 50);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Bank Name : CANARA BANK", margin + 4, bankStartY + 11);
    doc.text("A/C NO.    : 5864201000160", margin + 4, bankStartY + 16);
    doc.text("IFSC       : CNRB0005864", margin + 4, bankStartY + 21);
    doc.text("Branch     : TRICHY WORAIYUR, TAMIL NADU - 620003", margin + 4, bankStartY + 26);
    
    // Signatory Block
    doc.setTextColor(100, 100, 100);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("For SYFA ENTERPRISES,", 130, bankStartY + 5);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(130, bankStartY + 20, 196, bankStartY + 20); // matching right margin at 196
    doc.text("Authorized Signatory", 132, bankStartY + 25);
    
    // Centered Footnotes
    const footerY = bankStartY + 35;
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Thank you for choosing SYFA ENTERPRISES.", 105, footerY, { align: 'center' });
    doc.text("This invoice is computer generated and does not require a physical signature.", 105, footerY + 4, { align: 'center' });
    
    // Save PDF file using highly compatible blob download method
    const blob = doc.output('blob');
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, 'Invoice.pdf');
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Invoice.pdf';
        document.body.appendChild(a);
        a.click();
        
        // Open the PDF in a new tab to show it to the customer
        window.open(url, '_blank');
        
        setTimeout(() => {
            document.body.removeChild(a);
            // Delay revoking URL to ensure the browser has loaded the PDF in the new tab
            setTimeout(() => { URL.revokeObjectURL(url); }, 3000);
        }, 100);
    }
};