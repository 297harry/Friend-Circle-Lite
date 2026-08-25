function initialize_fc_lite() {

    // User config
    // Apply defaults
    UserConfig = {
        private_api_url: UserConfig?.private_api_url || "", 
        page_turning_number: UserConfig?.page_turning_number || 24, // 24 articles per page by default
        error_img: UserConfig?.error_img || "https://fastly.jsdelivr.net/gh/willow-god/Friend-Circle-Lite/static/favicon.ico", // default avatar
        lang: UserConfig?.lang || 'en' // article language filter
    };

    const root = document.getElementById('friend-circle-lite-root');
    
    if (!root) return; // Bail out if the root element doesn't exist

    // Clear previous content
    root.innerHTML = '';

    const randomArticleContainer = document.createElement('div');
    randomArticleContainer.id = 'random-article';
    randomArticleContainer.innerHTML = `
        <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading...</div>
        </div>
    `;
    root.appendChild(randomArticleContainer);

    const container = document.createElement('div');
    container.className = 'articles-container';
    container.id = 'articles-container';
    root.appendChild(container);
    
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-btn';
    loadMoreBtn.innerText = 'More';
    root.appendChild(loadMoreBtn);

    const statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    root.appendChild(statsContainer);

    let start = 0; // Current pagination offset
    let allArticles = []; // All loaded articles

    function loadMoreArticles() {
        const cacheKey = 'friend-circle-lite-cache';
        const cacheTimeKey = 'friend-circle-lite-cache-time';
        const cacheTime = localStorage.getItem(cacheTimeKey);
        const now = new Date().getTime();

        if (cacheTime && (now - cacheTime < 10 * 60 * 1000)) { // Cache is under 10 minutes old
            const cachedData = JSON.parse(localStorage.getItem(cacheKey));
            if (cachedData) {
                processArticles(cachedData);
                return;
            }
        }

        // 10 second timeout
        const timeoutId = setTimeout(() => {
            showError('Loading timed out, please refresh the page');
        }, 10000);

        fetch(`${UserConfig.private_api_url}all.json`)
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Network response error');
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(cacheTimeKey, now.toString());
                processArticles(data);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Load failed:', error);
                showError('Failed to load, please check your network connection');
            })
            .finally(() => {
                loadMoreBtn.innerText = 'More'; // Restore button text
            });
    }

    function showError(message) {
        randomArticleContainer.innerHTML = `
            <div class="error-placeholder">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
                <button class="retry-button" onclick="location.reload()">Reload</button>
            </div>
        `;
    }

    function processArticles(data) {
        // Missing lang is treated as 'en' for backward compatibility.
        allArticles = (data.article_data || []).filter(article => (article.lang || 'en') === UserConfig.lang);

        // Process the aggregated stats
        const stats = data.statistical_data;
        
        statsContainer.innerHTML = `
            <div>${stats.total_links} links with ${stats.active_links} active | ${stats.total_articles} articles in total</div>
            <div>Updated at:${stats.last_updated_time}</div>
            <div>Powered by: <a href="https://github.com/willow-god/Friend-Circle-Lite" target="_blank">FriendCircleLite</a><br></div>
        `;

        displayRandomArticle(stats); // Show a random friend-link card, passing the stats along

        const articles = allArticles.slice(start, start + UserConfig.page_turning_number);

        articles.forEach((article, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.05}s`;

            const title = document.createElement('div');
            title.className = 'card-title';
            title.innerText = article.title;
            title.title = article.title; // Show the full title on hover
            card.appendChild(title);
            title.onclick = () => window.open(article.link, '_blank');

            const author = document.createElement('div');
            author.className = 'card-author';
            const authorImg = document.createElement('img');
            authorImg.className = 'no-lightbox';
            authorImg.src = article.avatar || UserConfig.error_img;
            authorImg.onerror = () => authorImg.src = UserConfig.error_img;
            author.appendChild(authorImg);
            author.appendChild(document.createTextNode(article.author));
            card.appendChild(author);

            author.onclick = () => {
                showAuthorArticles(article.author, article.avatar, article.link);
            };

            const date = document.createElement('div');
            date.className = 'card-date';
            date.innerText = "🗓️" + article.created.substring(0, 10);
            card.appendChild(date);

            const bgImg = document.createElement('img');
            bgImg.className = 'card-bg no-lightbox';
            bgImg.src = article.avatar || UserConfig.error_img;
            bgImg.onerror = () => bgImg.src = UserConfig.error_img;
            card.appendChild(bgImg);

            container.appendChild(card);
        });

        start += UserConfig.page_turning_number;

        if (start >= allArticles.length) {
            loadMoreBtn.style.display = 'none'; // Hide the button
        }
    }

    // Show a random article
    function displayRandomArticle(stats) {
        const randomArticle = allArticles[Math.floor(Math.random() * allArticles.length)];
        if (!randomArticle) {
            randomArticleContainer.innerHTML = `
                <div class="error-placeholder">
                    <div class="error-text">No articles to show yet</div>
                </div>
            `;
            return;
        }
        randomArticleContainer.innerHTML = `
            <div class="random-content">
                <div class="random-container">
                    <div class="random-container-title">🎲 Random Pick</div>
                    <div class="random-title" title="${randomArticle.title}">${randomArticle.title}</div>
                    <div class="random-meta">
                        <span class="random-author">✍️ ${randomArticle.author}</span>
                        <span class="random-date">📅 ${randomArticle.created.substring(0, 10)}</span>
                    </div>
                </div>
                <div class="random-button-container">
                    <a href="#" id="refresh-random-article">🔄 Shuffle</a>
                    <button class="random-link-button" onclick="window.open('${randomArticle.link}', '_blank')">Read </button>
                </div>
            </div>
        `;

        // Wire up the refresh button
        const refreshBtn = document.getElementById('refresh-random-article');
        refreshBtn.addEventListener('click', function (event) {
            event.preventDefault();
            randomArticleContainer.style.opacity = '0.5';
            setTimeout(() => {
                displayRandomArticle(stats);
                randomArticleContainer.style.opacity = '1';
            }, 200);
        });
    }

    function showAuthorArticles(author, avatar, link) {
        // Build the modal markup if it doesn't exist yet
        if (!document.getElementById('fclite-modal')) {
            const modal = document.createElement('div');
            modal.id = 'modal';
            modal.className = 'modal';
            modal.innerHTML = `
            <div class="modal-content">
                <img id="modal-author-avatar" src="" alt="">
                <a id="modal-author-name-link"></a>
                <div id="modal-articles-container"></div>
                <img id="modal-bg" src="" alt="">
            </div>
            `;
            root.appendChild(modal);
        }

        const modal = document.getElementById('modal');
        const modalArticlesContainer = document.getElementById('modal-articles-container');
        const modalAuthorAvatar = document.getElementById('modal-author-avatar');
        const modalAuthorNameLink = document.getElementById('modal-author-name-link');
        const modalBg = document.getElementById('modal-bg');

        modalArticlesContainer.innerHTML = ''; // Clear previous content
        modalAuthorAvatar.src = avatar  || UserConfig.error_img; // Fall back to the default avatar
        modalAuthorAvatar.onerror = () => modalAuthorAvatar.src = UserConfig.error_img; // Fall back to the default avatar if it fails to load
        modalBg.src = avatar || UserConfig.error_img; // Fall back to the default avatar
        modalBg.onerror = () => modalBg.src = UserConfig.error_img; // Fall back to the default avatar if it fails to load
        modalAuthorNameLink.innerText = author;
        modalAuthorNameLink.href = new URL(link).origin;

        const authorArticles = allArticles.filter(article => article.author === author);
        // Cap at 5 articles so the modal doesn't grow too tall; show all if there are fewer
        authorArticles.slice(0, 4).forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'modal-article';

            const title = document.createElement('a');
            title.className = 'modal-article-title';
            title.innerText = article.title;
            title.href = article.link;
            title.target = '_blank';
            articleDiv.appendChild(title);

            const date = document.createElement('div');
            date.className = 'modal-article-date';
            date.innerText = "📅" + article.created.substring(0, 10);
            articleDiv.appendChild(date);

            modalArticlesContainer.appendChild(articleDiv);
        });

        // Add the class to trigger the show animation
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('modal-open');
        }, 10); // Ensure the show animation actually fires
    }

    // Hide the modal
    function hideModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('modal-open');
        modal.addEventListener('transitionend', () => {
            modal.style.display = 'none';
            root.removeChild(modal);
        }, { once: true });
    }

    // Initial load
    loadMoreArticles();

    // Load-more button click handler
    loadMoreBtn.addEventListener('click', loadMoreArticles);

    // Close the modal when clicking the overlay
    window.onclick = function(event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            hideModal();
        }
    };
};

function whenDOMReady() {
    initialize_fc_lite();
}

whenDOMReady();
document.addEventListener("pjax:complete", initialize_fc_lite);