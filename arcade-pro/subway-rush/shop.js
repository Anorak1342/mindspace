class ShopManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.items = [
            { id: 'jetpack', name: 'Jetpack', price: 200, icon: '🚀', desc: 'Fly over trains!' },
            { id: 'sneakers', name: 'Super Sneakers', price: 150, icon: '👟', desc: 'Jump higher!' },
            { id: 'magnet', name: 'Coin Magnet', price: 150, icon: '🧲', desc: 'Attract all coins!' },
            { id: 'hoverboard', name: 'Hoverboard', price: 300, icon: '🛹', desc: 'Crash protection!' }
        ];
    }

    renderShop() {
        const grid = document.getElementById('shopGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        this.items.forEach(item => {
            const count = this.game.inventory[item.id] || 0;
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-price">
                    <div class="coin-icon-hud" style="width:15px; height:15px"></div>
                    ${item.price}
                </div>
                <div class="shop-item-count">Owned: ${count}</div>
            `;
            // Reference this specific scope
            div.onclick = () => this.buyItem(item);
            grid.appendChild(div);
        });
        
        document.getElementById('shopCoins').innerText = this.formatNumber(this.game.totalCoins);
        document.getElementById('menuCoins').innerText = this.formatNumber(this.game.totalCoins);
    }

    buyItem(item) {
        if (this.game.totalCoins >= item.price) {
            this.game.totalCoins -= item.price;
            this.game.inventory[item.id] = (this.game.inventory[item.id] || 0) + 1;
            this.game.saveData();
            this.renderShop();
            this.game.sound.playCoin(); // Success sound
            this.game.showMessage(`Bought ${item.name}!`, 'success');
        } else {
            this.game.sound.playClick(); // Error sound
            this.game.showMessage('Not enough coins!', 'error');
        }
    }

    openShop() {
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('shopMenu').style.display = 'flex';
        this.renderShop();
    }

    closeShop() {
        document.getElementById('shopMenu').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }
    
    formatNumber(num) {
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}