import "./style.css";

    (function () {
        "use strict";

        var SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ppoxtcnwluepfbwsxhzj.supabase.co";
        var SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SI-pLOGHKAnKF5y1GLrcBw_sdKCLGZB";
        var supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient)
            ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
            : null;
        var STARTERS = [
            { name: "Elegance Titanium", price: 45000, oldPrice: 52000, badge: "-20%", imageId: "", order: 1 },
            { name: "Luxury Classic",    price: 55000, oldPrice: 60000, badge: "NEW", imageId: "", order: 2 },
            { name: "Premium Steel",     price: 38500, oldPrice: 45000, badge: "-15%", imageId: "", order: 3 },
            { name: "Elite Collection",  price: 65000, oldPrice: 75000, badge: "FEATURED", imageId: "", order: 4 }
        ];
        var grid = document.getElementById("productsGrid");
        var products = [];
        function money(n) {
            return "PKR " + Number(n || 0).toLocaleString("en-US");
        }
        function esc(str) {
            return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
            });
        }
        function imgSrc(id) {
            if (!id) return "";
            if (/^https?:\/\//i.test(id)) return id;
            return "/_blob/" + id;
        }
        /* ---------- storefront rendering ---------- */
        function renderGrid() {
            if (!products.length) {
                grid.innerHTML = '<div class="products-empty">No watches in the collection yet.</div>';
                return;
            }
            grid.innerHTML = products.map(function (p) {
                var pic = p.imageId
                    ? '<img src="' + esc(imgSrc(p.imageId)) + '" alt="' + esc(p.name) + '">'
                    : "<span>&#8986;</span>";
                var badge = p.badge ? '<span class="product-badge">' + esc(p.badge) + "</span>" : "";
                var oldp = p.oldPrice ? '<span class="old-price">' + esc(money(p.oldPrice)) + "</span>" : "";
                return '<div class="product-card">' +
                    '<div class="product-image">' + pic + badge + "</div>" +
                    '<div class="product-info">' +
                    '<div class="product-name">' + esc(p.name) + "</div>" +
                    '<div class="product-price">' + esc(money(p.price)) + oldp + "</div>" +
                    '<div class="product-actions"><button data-cart="' + esc(p.id) + '">Add to Cart</button><button data-order="' + esc(p.id) + '">Order Now</button></div>' +
                    "</div></div>";
            }).join("");
        }


        /* ---------- hero slideshow ---------- */
        var heroSection = document.getElementById("home");
        var heroImg = document.getElementById("heroImg");
        var heroTitle = document.getElementById("heroTitle");
        var heroDesc = document.getElementById("heroDesc");
        var heroPrice = document.getElementById("heroPrice");
        var heroTag = document.getElementById("heroTag");
        var heroDots = document.getElementById("heroDots");
        var DEFAULT_HERO = heroImg.getAttribute("src");
        var heroIndex = 0;
        var heroTimer = null;
        var heroPaused = false;

        function accentLast(name) {
            var parts = String(name).trim().split(/\s+/);
            if (parts.length < 2) return '<span class="accent">' + esc(name) + "</span>";
            var last = parts.pop();
            return esc(parts.join(" ")) + ' <span class="accent">' + esc(last) + "</span>";
        }

        function paintHero(i) {
            var p = products[i];
            if (!p) return;
            heroTitle.innerHTML = accentLast(p.name);
            heroDesc.textContent = "Part of the Prestige Wear collection \u2014 crafted for style, confidence and timeless elegance.";
            heroTag.textContent = p.badge || "";
            heroPrice.innerHTML = esc(money(p.price)) +
                (p.oldPrice ? '<span class="was">' + esc(money(p.oldPrice)) + "</span>" : "");
            heroImg.src = p.imageId ? imgSrc(p.imageId) : DEFAULT_HERO;
            heroImg.alt = p.name;
            Array.prototype.forEach.call(heroDots.children, function (b, n) {
                b.className = n === i ? "active" : "";
            });
        }

        function goHero(i) {
            if (!products.length) return;
            heroIndex = (i + products.length) % products.length;
            heroSection.classList.add("hero-fade");
            setTimeout(function () {
                paintHero(heroIndex);
                heroSection.classList.remove("hero-fade");
            }, 500);
        }

        function renderHero() {
            if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
            if (!products.length) { heroDots.innerHTML = ""; return; }
            heroDots.innerHTML = products.map(function (p, i) {
                return '<button aria-label="Show ' + esc(p.name) + '" data-slide="' + i + '"></button>';
            }).join("");
            if (heroIndex >= products.length) heroIndex = 0;
            paintHero(heroIndex);
            if (products.length > 1) {
                heroTimer = setInterval(function () {
                    if (!heroPaused && !document.hidden) goHero(heroIndex + 1);
                }, 3000);
            }
        }

        heroDots.addEventListener("click", function (e) {
            var n = e.target.getAttribute && e.target.getAttribute("data-slide");
            if (n !== null && n !== undefined) goHero(parseInt(n, 10));
        });
        heroSection.addEventListener("mouseenter", function () { heroPaused = true; });
        heroSection.addEventListener("mouseleave", function () { heroPaused = false; });
        /* ---------- orders ---------- */
        var orderOverlay = document.getElementById("orderOverlay");
        var oProduct = document.getElementById("oProduct");
        var oName = document.getElementById("oName"), oPhone = document.getElementById("oPhone"),
            oPhone2 = document.getElementById("oPhone2"), oEmail = document.getElementById("oEmail"),
            oAddr = document.getElementById("oAddr"), oNear = document.getElementById("oNear"),
            oSubmit = document.getElementById("oSubmit");
        var toastEl = document.getElementById("toast"), toastTimer = null;
        var toastCheckEl = document.getElementById("toastCheck"), toastMsgEl = document.getElementById("toastMsg");
        var orderProduct = null, isCartCheckout = false;
        /* ---------- cart ---------- */
        var cart = [];
        try {
            var savedCart = JSON.parse(localStorage.getItem("pw_cart") || "[]");
            if (Array.isArray(savedCart)) cart = savedCart;
        } catch (e) {}
        var cartOverlay = document.getElementById("cartOverlay");
        var cartItemsEl = document.getElementById("cartItems");
        var cartTotalEl = document.getElementById("cartTotal");
        var cartCheckoutBtn = document.getElementById("cartCheckout");
        var cartOpenBtn = document.getElementById("cartOpenBtn");
        var cartCloseBtn = document.getElementById("cartClose");
        var cartBadgeEl = document.getElementById("cartBadge");

        function saveCart() {
            try { localStorage.setItem("pw_cart", JSON.stringify(cart)); } catch (e) {}
        }
        function cartQtyTotal() {
            return cart.reduce(function (s, it) { return s + it.qty; }, 0);
        }
        function updateCartBadge() {
            if (cartBadgeEl) cartBadgeEl.textContent = cartQtyTotal();
        }
        function renderCart() {
            if (!cart.length) {
                cartItemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
                cartTotalEl.textContent = money(0);
                cartCheckoutBtn.disabled = true;
                return;
            }
            var total = 0;
            cartItemsEl.innerHTML = cart.map(function (it) {
                total += it.price * it.qty;
                var pic = it.imageId ? '<img class="cart-item-img" src="' + esc(imgSrc(it.imageId)) + '" alt="' + esc(it.name) + '">' : '<div class="cart-item-img">&#8986;</div>';
                return '<div class="cart-item">' + pic +
                    '<div class="cart-item-main"><strong>' + esc(it.name) + '</strong><span>' + esc(money(it.price)) + ' each</span></div>' +
                    '<div class="cart-qty"><button data-dec="' + esc(it.id) + '">&minus;</button><span>' + it.qty + '</span><button data-inc="' + esc(it.id) + '">+</button></div>' +
                    '<button class="cart-remove" data-remove="' + esc(it.id) + '">Remove</button>' +
                    '</div>';
            }).join("");
            cartTotalEl.textContent = money(total);
            cartCheckoutBtn.disabled = false;
        }
        updateCartBadge();

        cartOpenBtn.addEventListener("click", function (e) {
            e.preventDefault();
            renderCart();
            cartOverlay.classList.add("open");
        });
        cartCloseBtn.addEventListener("click", function () { cartOverlay.classList.remove("open"); });
        cartOverlay.addEventListener("click", function (e) { if (e.target === cartOverlay) cartOverlay.classList.remove("open"); });
        cartItemsEl.addEventListener("click", function (e) {
            var inc = e.target.getAttribute && e.target.getAttribute("data-inc");
            var dec = e.target.getAttribute && e.target.getAttribute("data-dec");
            var rem = e.target.getAttribute && e.target.getAttribute("data-remove");
            if (inc) {
                var itInc = cart.filter(function (x) { return x.id === inc; })[0];
                if (itInc) itInc.qty++;
            } else if (dec) {
                var itDec = cart.filter(function (x) { return x.id === dec; })[0];
                if (itDec) { itDec.qty--; if (itDec.qty <= 0) cart = cart.filter(function (x) { return x.id !== dec; }); }
            } else if (rem) {
                cart = cart.filter(function (x) { return x.id !== rem; });
            } else { return; }
            saveCart();
            updateCartBadge();
            renderCart();
        });

        function toast(text, kind) {
            toastMsgEl.textContent = text;
            toastCheckEl.innerHTML = kind === "err" ? "&times;" : "&#10003;";
            toastEl.className = "toast show" + (kind === "err" ? " err" : "");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { toastEl.className = "toast"; }, 3500);
        }
        function closeOrder() { orderOverlay.classList.remove("open"); }

        grid.addEventListener("click", function (e) {
            var orderId = e.target.getAttribute && e.target.getAttribute("data-order");
            if (orderId) {
                orderProduct = products.filter(function (x) { return x.id === orderId; })[0];
                if (!orderProduct) return;
                isCartCheckout = false;
                oProduct.textContent = orderProduct.name + " \u2014 " + money(orderProduct.price);
                orderOverlay.classList.add("open");
                oName.focus();
                return;
            }
            var cartId = e.target.getAttribute && e.target.getAttribute("data-cart");
            if (cartId) {
                var cp = products.filter(function (x) { return x.id === cartId; })[0];
                if (!cp) return;
                var existing = cart.filter(function (it) { return it.id === cartId; })[0];
                if (existing) { existing.qty++; }
                else { cart.push({ id: cp.id, name: cp.name, price: cp.price, imageId: cp.imageId, qty: 1 }); }
                saveCart();
                updateCartBadge();
                renderCart();
                toast(cp.name + " added to cart!");
            }
        });
        cartCheckoutBtn.addEventListener("click", function () {
            if (!cart.length) return;
            isCartCheckout = true;
            orderProduct = null;
            var total = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
            var itemsSummary = cart.map(function (it) { return it.name + " x" + it.qty; }).join(", ");
            oProduct.textContent = itemsSummary + " \u2014 Total: " + money(total);
            cartOverlay.classList.remove("open");
            orderOverlay.classList.add("open");
            oName.focus();
        });
        document.getElementById("oCancel").addEventListener("click", closeOrder);
        orderOverlay.addEventListener("click", function (e) { if (e.target === orderOverlay) closeOrder(); });

        oSubmit.addEventListener("click", function () {
            var name = oName.value.trim(), phone = oPhone.value.trim(), addr = oAddr.value.trim();
            if (!name || !phone || !addr) { toast("Please fill name, mobile number and address.", "err"); return; }
            if (!supabaseClient) { toast("Sorry, order could not be placed right now.", "err"); return; }
            oSubmit.disabled = true;
            var orderRow;
            if (isCartCheckout) {
                var total = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
                orderRow = {
                    name: name, phone: phone, phone2: oPhone2.value.trim(), email: oEmail.value.trim(),
                    address: addr, near: oNear.value.trim(),
                    product: cart.map(function (it) { return it.name + " x" + it.qty; }).join(", "),
                    price: total
                };
            } else {
                orderRow = {
                    name: name, phone: phone, phone2: oPhone2.value.trim(), email: oEmail.value.trim(),
                    address: addr, near: oNear.value.trim(), product: orderProduct ? orderProduct.name : "",
                    price: orderProduct ? orderProduct.price : 0
                };
            }

            supabaseClient.from("orders").insert([orderRow]).then(function (res) {
                if (res.error) {
                    toast("Order could not be placed. Please try again.", "err");
                    oSubmit.disabled = false;
                    return;
                }
                closeOrder();
                oName.value = oPhone.value = oPhone2.value = oEmail.value = oAddr.value = oNear.value = "";
                if (isCartCheckout) { cart = []; saveCart(); updateCartBadge(); renderCart(); }
                isCartCheckout = false;
                toast("Thanks for your order! We will contact you soon.");
                oSubmit.disabled = false;
            }).catch(function () {
                toast("Order could not be placed. Please try again.", "err");
                oSubmit.disabled = false;
            });
        });

        /* ---------- chatbot ---------- */
        var chatWin = document.getElementById("chatWin"), chatLog = document.getElementById("chatLog"),
            chatText = document.getElementById("chatText");

        function addMsg(html, who) {
            var d = document.createElement("div");
            d.className = "msg " + who;
            d.innerHTML = html;
            chatLog.appendChild(d);
            chatLog.scrollTop = chatLog.scrollHeight;
        }
        function botReply(q) {
            var t = q.toLowerCase();
            var hit = products.filter(function (p) { return t.indexOf(String(p.name).toLowerCase()) !== -1; })[0];
            if (hit) {
                return "<b>" + esc(hit.name) + "</b><br>Price: " + esc(money(hit.price)) +
                    (hit.oldPrice ? " (pehle " + esc(money(hit.oldPrice)) + ")" : "") +
                    "<br>Order karne ke liye is watch par <b>Order Now</b> dabayein.";
            }
            if (/deliver|shipping|ship|pakistan|city|shehar|shahar|courier|cod|cash/.test(t)) {
                return "Ji haan! &#127477;&#127472; Hum <b>poore Pakistan</b> me delivery karte hain. Cash on delivery bhi available hai.";
            }
            if (/price|prices|rate|qeemat|kimat|kitne|kitna|cost|pkr/.test(t)) {
                if (!products.length) return "Abhi koi watch listed nahi hai.";
                return "<b>Price list:</b><br>" + products.map(function (p) {
                    return esc(p.name) + " &mdash; " + esc(money(p.price));
                }).join("<br>");
            }
            if (/item|items|list|watch|watches|collection|product|products|available|kya hai/.test(t)) {
                if (!products.length) return "Abhi koi watch listed nahi hai.";
                return "<b>Hamari watches:</b><br>" + products.map(function (p) {
                    return "&#8986; " + esc(p.name);
                }).join("<br>") + "<br>Kisi ki price poochne ke liye us ka naam likhein.";
            }
            if (/order|buy|khareed|purchase|kaise/.test(t)) {
                return "Order karna asaan hai: apni pasand ki watch par <b>Order Now</b> dabayein, naam, mobile number aur address bharein, aur <b>Confirm Order</b> dabayein. Hum aap se rabta karenge.";
            }
            if (/\b(hi|hello|salam|assalam|hey)\b/.test(t)) {
                return "Assalam o Alaikum! Main price, watch list aur delivery ke bare me bata sakta hoon.";
            }
            return "Maaf kijiye, main yeh nahi samajh saka. Aap <b>price</b>, <b>watch list</b>, <b>delivery</b> ya <b>order</b> ke bare me pooch sakte hain.";
        }
        function ask(q) {
            q = q.trim();
            if (!q) return;
            addMsg(esc(q), "me");
            setTimeout(function () { addMsg(botReply(q), "bot"); }, 300);
        }
        function openChat() {
            chatWin.classList.add("open");
            if (!chatLog.children.length) addMsg("Assalam o Alaikum! Prestige Wear me khush aamdeed. Aap price, watch list ya delivery ke bare me pooch sakte hain.", "bot");
            chatText.focus();
        }
        document.getElementById("chatFab").addEventListener("click", function () {
            if (chatWin.classList.contains("open")) chatWin.classList.remove("open"); else openChat();
        });
        document.getElementById("chatClose").addEventListener("click", function () { chatWin.classList.remove("open"); });
        document.getElementById("chatChips").addEventListener("click", function (e) {
            if (e.target.tagName === "BUTTON") ask(e.target.textContent);
        });
        document.getElementById("chatSend").addEventListener("click", function () { ask(chatText.value); chatText.value = ""; });
        chatText.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { ask(chatText.value); chatText.value = ""; }
        });
        /* ---------- startup ---------- */
        products = STARTERS.map(function (p, i) {
            var c = Object.assign({}, p); c.id = "starter-" + i; return c;
        });
        renderGrid();
        renderHero();


        var productsChannel = null;
        function loadProducts() {
            if (!supabaseClient) return;
            supabaseClient.from("products").select("*").order("sort_order", { ascending: true }).then(function (res) {
                if (res.error) { console.error("products load failed", res.error); return; }
                var rows = res.data || [];
                if (!rows.length) return; // keep showing starter watches until real products exist
                products = rows.map(function (data) {
                    return {
                        id: data.id,
                        name: data.name || "Untitled",
                        price: data.price || 0,
                        oldPrice: data.old_price || 0,
                        badge: data.badge || "",
                        imageId: data.image_url || "",
                        order: data.sort_order || 0
                    };
                });
                renderGrid();
                renderHero();
            });
        }
        if (supabaseClient) {
            loadProducts();
            productsChannel = supabaseClient
                .channel("products-changes")
                .on("postgres_changes", { event: "*", schema: "public", table: "products" }, function () { loadProducts(); })
                .subscribe();
        }
    })();
