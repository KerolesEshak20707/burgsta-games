// ===== لعبة السندوتشات المتساقطة - Burgsta =====

// إعدادات اللعبة
const GAME_CONFIG = {
    // أبعاد اللعبة
    width: window.innerWidth,
    height: window.innerHeight,
    
    // إعدادات اللاعب
    player: {
        speed: 25,  // سرعة صاروخية للاستجابة الفورية
        size: 80
    },
    
    // إعدادات السندوتشات
    items: {
        baseSpeed: 80,         // بداية هادئة وبطيئة
        speedIncrement: 10,    // زيادة سرعة تدريجية
        baseSpawnRate: 1200,   // بداية مريحة جداً
        spawnRateDecrement: 30, // تسارع تدريجي في الظهور
        minSpawnRate: 300      // حد أدنى معقول في النهاية
    },
    
    // نظام الخصم
    discount: {
        goodSandwich: 1,    // +1% لكل سندوتش جيد (تدريج بطيء)
        goldenSandwich: 3,  // +3% للسندوتش الذهبي (معقول)
        badItem: -2,        // -2% للعناصر السيئة (مش قاسي)
        maxDiscount: 100
    },
    
    // الألوان (هوية Burgsta)
    colors: {
        primary: '#c49b41',
        secondary: '#f5f1e6',
        dark: '#8b6914',
        light: '#fff9e6',
        text: '#5d4e37',
        accent: '#d4af37',
        danger: '#e74c3c',
        success: '#27ae60'
    }
};

// نظام المراحل والمخاطرة - مثل "من سيربح المليون" 🎯
const RISK_LEVELS = [
    { 
        percent: 10, 
        message: "خصم 10%", 
        difficulty: 1,
        reached: false,
        description: "🎉 مبروك! وصلت للمستوى الأول",
        reward: "خصم 10% على طلبك + 🥇 سندويتش ذهبي سريع!",
        nextRisk: "الصعوبة ستزيد قليلاً..."
    },
    { 
        percent: 25, 
        message: "خصم 25%", 
        difficulty: 2,
        reached: false,
        description: "🔥 ممتاز! مستوى متقدم",
        reward: "خصم ربع على طلبك + 🥇 سندويتش ذهبي أسرع!", 
        nextRisk: "سرعة أكبر وعناصر سيئة أكثر!"
    },
    { 
        percent: 50, 
        message: "خصم 50%", 
        difficulty: 3,
        reached: false,
        description: "⭐ رائع جداً! نصف الطريق",
        reward: "خصم نصف السعر + 🥇 سندويتش ذهبي فائق السرعة!",
        nextRisk: "تحدي شديد في انتظارك..."
    },
    { 
        percent: 75, 
        message: "خصم 75%", 
        difficulty: 4,
        reached: false,
        description: "🏆 إنجاز استثنائي!",
        reward: "خصم ثلاثة أرباع السعر + 🥇 سندويتش ذهبي صاروخي!",
        nextRisk: "المرحلة الأخيرة... صعبة جداً!"
    },
    { 
        percent: 100, 
        message: "🍔 وجبة مجانية كاملة!", 
        difficulty: 5,
        reached: false,
        description: "👑 المستوى الأسطوري!",
        reward: "وجبة مجانية 100% - تستحق التحية!",
        nextRisk: "هذا أقصى مستوى!"
    }
];

// مدير اللعبة
class GameManager {
    constructor() {
        this.score = 0;
        this.discount = 0;
        this.level = 1;
        this.lives = 3;
        this.gameOver = false;
        this.gameWon = false;
        this.isInRiskMode = false; // هل اللعبة متوقفة للمخاطرة؟
        this.currentRiskLevel = null; // المستوى الحالي للمخاطرة
        
        // السندوتش الذهبي الخاص للمخاطرة 🌟
        this.riskGoldenSandwiches = {
            10: false,  // هل تم إطلاق سندوتش 10%؟
            25: false,  // هل تم إطلاق سندوتش 25%؟
            50: false,  // هل تم إطلاق سندوتش 50%؟
            75: false   // هل تم إطلاق سندوتش 75%؟
        };
        
        // إحصائيات
        this.goodCaught = 0;
        this.badCaught = 0;
        this.goldenCaught = 0;
        this.sandwichesMissed = 0; // 💔 السندوتشات المفقودة
        
        // أصوات اللعبة
        this.sounds = {};
        this.soundEnabled = true;
    }
    
    addDiscount(amount) {
        const oldDiscount = this.discount;
        this.discount = Math.max(0, Math.min(this.discount + amount, GAME_CONFIG.discount.maxDiscount));
        
        // إشعارات تصاعد الصعوبة
        this.checkDifficultyIncrease(oldDiscount, this.discount);
        
        // تحقق من الإنجازات
        this.checkAchievements();
        
        return this.discount;
    }
    
    checkDifficultyIncrease(oldDiscount, newDiscount) {
        // إشعارات عند الوصول لمراحل جديدة

    }
    
    checkAchievements() {
        // مستويات الجوائز
        if (this.discount >= 100 && !this.gameWon) {
            this.gameWon = true;
            this.triggerWin('وجبة مجانية 🎉');
        } else if (this.discount >= 60 && !this.achievements?.discount60) {
            this.achievements = this.achievements || {};
            this.achievements.discount60 = true;
            this.triggerAchievement('خصم 50% على الوجبة 🍔');
        } else if (this.discount >= 30 && !this.achievements?.discount30) {
            this.achievements = this.achievements || {};
            this.achievements.discount30 = true;
            this.triggerAchievement('خصم على وجبة جانبية 🍟');
        }
    }
    
    triggerAchievement(message) {
        // سيتم تنفيذها في مشهد اللعبة
        if (window.gameScene) {
            window.gameScene.showAchievement(message);
        }
    }
    
    triggerWin(message) {
        if (window.gameScene) {
            window.gameScene.showWinScreen(message);
        }
    }
    
    loseLife() {
        this.lives = Math.max(0, this.lives - 1); // حماية من القيم السالبة
        if (this.lives <= 0) {
            this.gameOver = true;
            if (window.gameScene) {
                window.gameScene.showGameOver();
            }
        }
        return this.lives;
    }
    
    getCurrentItemSpeed() {
        // السرعة تزيد حسب نسبة الخصم المحققة
        let speedMultiplier = 1;
        
        if (this.discount >= 75) {
            speedMultiplier = 2.5; // سريع جداً!
        } else if (this.discount >= 50) {
            speedMultiplier = 2.0; // سريع
        } else if (this.discount >= 25) {
            speedMultiplier = 1.5; // متوسط السرعة
        } else if (this.discount >= 10) {
            speedMultiplier = 1.2; // أسرع قليلاً
        }
        
        return GAME_CONFIG.items.baseSpeed * speedMultiplier;
    }
    
    getCurrentSpawnRate() {
        // معدل الظهور يزيد (الوقت يقل) حسب نسبة الخصم
        let spawnMultiplier = 1;
        
        if (this.discount >= 75) {
            spawnMultiplier = 0.3; // ظهور سريع جداً!
        } else if (this.discount >= 50) {
            spawnMultiplier = 0.5; // ظهور سريع
        } else if (this.discount >= 25) {
            spawnMultiplier = 0.7; // ظهور متوسط
        } else if (this.discount >= 10) {
            spawnMultiplier = 0.85; // ظهور أسرع قليلاً
        }
        
        const rate = GAME_CONFIG.items.baseSpawnRate * spawnMultiplier;
        return Math.max(rate, GAME_CONFIG.items.minSpawnRate);
    }
    
    updateLevel() {
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            if (window.gameScene) {
                window.gameScene.showLevelUp(this.level);
            }
        }
    }
}

// مشهد اللعبة الرئيسي
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.fallingItems = null;
        this.ui = {};
        this.spawnTimer = null;
        this.gameManager = new GameManager();
        this.sounds = {}; // تهيئة الأصوات فوراً لتجنب الأخطاء
    }
    
    preload() {
        // إنشاء الأشكال بدلاً من تحميل صور
        this.createGameAssets();
    }
    
    createGameAssets() {
        // إنشاء أشكال ملونة وجذابة للعناصر المختلفة
        
        // اللاعب (طبق جميل)
        const playerGraphics = this.add.graphics();
        // خلفية الطبق (ذهبية)
        playerGraphics.fillStyle(0xc49b41);
        playerGraphics.fillRoundedRect(0, 0, 80, 20, 10);
        // حافة الطبق (ذهبي فاتح)
        playerGraphics.fillStyle(0xd4af37);
        playerGraphics.fillRoundedRect(3, 3, 74, 14, 7);
        // وسط الطبق (أبيض كريمي)
        playerGraphics.fillStyle(0xfff9e6);
        playerGraphics.fillRoundedRect(6, 6, 68, 8, 4);
        // خطوط زخرفية
        playerGraphics.lineStyle(1, 0xc49b41);
        playerGraphics.beginPath();
        playerGraphics.moveTo(10, 10);
        playerGraphics.lineTo(70, 10);
        playerGraphics.strokePath();
        playerGraphics.generateTexture('player', 80, 20);
        playerGraphics.destroy();
        
        // سندوتش جيد (برجر شهي)
        const goodSandwichGraphics = this.add.graphics();
        // الخبز العلوي (بني ذهبي)
        goodSandwichGraphics.fillStyle(0xd2691e);
        goodSandwichGraphics.fillRoundedRect(0, 0, 40, 12, 6);
        // بذور السمسم
        goodSandwichGraphics.fillStyle(0xffffff);
        goodSandwichGraphics.fillCircle(10, 6, 1);
        goodSandwichGraphics.fillCircle(18, 4, 1);
        goodSandwichGraphics.fillCircle(30, 5, 1);
        // الخس (أخضر)
        goodSandwichGraphics.fillStyle(0x228b22);
        goodSandwichGraphics.fillRect(3, 12, 34, 3);
        // اللحم (بني)
        goodSandwichGraphics.fillStyle(0x8b4513);
        goodSandwichGraphics.fillRect(5, 15, 30, 4);
        // الجبن (أصفر)
        goodSandwichGraphics.fillStyle(0xffd700);
        goodSandwichGraphics.fillRect(4, 19, 32, 2);
        // الخبز السفلي (بني فاتح)
        goodSandwichGraphics.fillStyle(0xdaa520);
        goodSandwichGraphics.fillRoundedRect(2, 21, 36, 9, 4);
        goodSandwichGraphics.generateTexture('goodSandwich', 40, 30);
        goodSandwichGraphics.destroy();
        
        // سندوتش ذهبي (برجر فاخر)
        const goldenSandwichGraphics = this.add.graphics();
        // إشعاع ذهبي في الخلفية
        goldenSandwichGraphics.fillStyle(0xffd700, 0.3);
        goldenSandwichGraphics.fillCircle(22, 17, 25);
        // الخبز العلوي (ذهبي لامع)
        goldenSandwichGraphics.fillStyle(0xffd700);
        goldenSandwichGraphics.fillRoundedRect(5, 2, 35, 12, 6);
        // تأثير لمعان
        goldenSandwichGraphics.fillStyle(0xffffe0);
        goldenSandwichGraphics.fillRoundedRect(7, 4, 15, 4, 2);
        // بذور ذهبية
        goldenSandwichGraphics.fillStyle(0xffa500);
        goldenSandwichGraphics.fillCircle(12, 8, 1);
        goldenSandwichGraphics.fillCircle(20, 6, 1);
        goldenSandwichGraphics.fillCircle(28, 7, 1);
        // الخس الذهبي
        goldenSandwichGraphics.fillStyle(0x32cd32);
        goldenSandwichGraphics.fillRect(6, 14, 33, 3);
        // اللحم المميز
        goldenSandwichGraphics.fillStyle(0xa0522d);
        goldenSandwichGraphics.fillRect(7, 17, 31, 5);
        // الجبن الذهبي
        goldenSandwichGraphics.fillStyle(0xffd700);
        goldenSandwichGraphics.fillRect(6, 22, 33, 3);
        // الخبز السفلي
        goldenSandwichGraphics.fillStyle(0xdaa520);
        goldenSandwichGraphics.fillRoundedRect(4, 25, 37, 10, 5);
        // حدود ذهبية
        goldenSandwichGraphics.lineStyle(2, 0xffd700);
        goldenSandwichGraphics.strokeRoundedRect(3, 1, 39, 34, 8);
        goldenSandwichGraphics.generateTexture('goldenSandwich', 45, 35);
        goldenSandwichGraphics.destroy();
        
        // عنصر سيئ (سندوتش فاسد ومقزز)
        const badItemGraphics = this.add.graphics();
        // الخبز العلوي الفاسد (رمادي مخضر مقزز)
        badItemGraphics.fillStyle(0x556b2f);
        badItemGraphics.fillRoundedRect(0, 0, 40, 12, 6);
        // بقع عفن على الخبز
        badItemGraphics.fillStyle(0x2f4f2f);
        badItemGraphics.fillCircle(8, 6, 2);
        badItemGraphics.fillCircle(25, 4, 1.5);
        badItemGraphics.fillCircle(32, 7, 1);
        // بذور متعفنة (سوداء)
        badItemGraphics.fillStyle(0x000000);
        badItemGraphics.fillCircle(12, 6, 1);
        badItemGraphics.fillCircle(20, 4, 1);
        badItemGraphics.fillCircle(28, 5, 1);
        // الخس الذابل (بني مصفر)
        badItemGraphics.fillStyle(0x8b7355);
        badItemGraphics.fillRect(3, 12, 34, 3);
        // بقع على الخس
        badItemGraphics.fillStyle(0x654321);
        badItemGraphics.fillRect(8, 12, 6, 1);
        badItemGraphics.fillRect(20, 13, 8, 1);
        // اللحم الفاسد (أخضر مقزز)
        badItemGraphics.fillStyle(0x6b8e23);
        badItemGraphics.fillRect(5, 15, 30, 4);
        // بقع فساد على اللحم
        badItemGraphics.fillStyle(0x2e8b57);
        badItemGraphics.fillRect(10, 16, 4, 1);
        badItemGraphics.fillRect(22, 15, 6, 2);
        // الجبن المتعفن (أصفر مخضر)
        badItemGraphics.fillStyle(0x9acd32);
        badItemGraphics.fillRect(4, 19, 32, 2);
        // بقع عفن على الجبن
        badItemGraphics.fillStyle(0x556b2f);
        badItemGraphics.fillRect(12, 19, 3, 1);
        badItemGraphics.fillRect(26, 20, 4, 1);
        // الخبز السفلي الفاسد (بني داكن)
        badItemGraphics.fillStyle(0x8b4513);
        badItemGraphics.fillRoundedRect(2, 21, 36, 9, 4);
        // شقوق في الخبز السفلي
        badItemGraphics.lineStyle(1, 0x654321);
        badItemGraphics.beginPath();
        badItemGraphics.moveTo(8, 25);
        badItemGraphics.lineTo(15, 27);
        badItemGraphics.moveTo(22, 24);
        badItemGraphics.lineTo(30, 26);
        badItemGraphics.strokePath();
        // ذباب صغير حول السندوتش (نقاط سوداء متحركة)
        badItemGraphics.fillStyle(0x000000);
        badItemGraphics.fillCircle(-2, 8, 0.5);
        badItemGraphics.fillCircle(42, 15, 0.5);
        badItemGraphics.fillCircle(38, 5, 0.5);
        // هالة خضراء مقززة حول السندوتش
        badItemGraphics.fillStyle(0x228b22, 0.1);
        badItemGraphics.fillCircle(20, 15, 25);
        // خطوط رائحة كريهة
        badItemGraphics.lineStyle(1, 0x696969, 0.3);
        badItemGraphics.beginPath();
        badItemGraphics.moveTo(15, 0);
        badItemGraphics.lineTo(13, -5);
        badItemGraphics.moveTo(20, -2);
        badItemGraphics.lineTo(18, -7);
        badItemGraphics.moveTo(25, 0);
        badItemGraphics.lineTo(27, -5);
        badItemGraphics.strokePath();
        badItemGraphics.generateTexture('badItem', 40, 30);
        badItemGraphics.destroy();
    }
    
    create() {
        window.gameScene = this; // مرجع عام للمشهد
        
        // إخفاء شاشة التحميل
        document.querySelector('.loading').style.display = 'none';
        
        // إنشاء الخلفية
        this.createBackground();
        
        // إنشاء اللاعب
        this.createPlayer();
        
        // إنشاء مجموعة العناصر المتساقطة
        this.fallingItems = this.physics.add.group();
        
        // إنشاء واجهة المستخدم
        this.createUI();
        
        // إعداد التحكم
        this.setupControls();
        
        // إعداد التصادمات
        this.setupCollisions();
        
        // ✅ إعداد مراقبة حدود العالم لحذف العناصر
        const gameAreaWidth = GAME_CONFIG.width - 180;
        this.physics.world.setBounds(0, 0, gameAreaWidth, GAME_CONFIG.height);
        
        this.physics.world.on('worldbounds', (body) => {
            // نتعامل فقط مع العناصر التي ليست من fallingItems
            // العناصر المتساقطة لها معالج خاص في createFallingItem
            if (body.gameObject && (body.gameObject.y > GAME_CONFIG.height || body.gameObject.x > gameAreaWidth)) {
                if (!this.fallingItems.contains(body.gameObject)) {
                    // للعناصر الأخرى مثل التأثيرات المؤقتة
                    body.gameObject.destroy();
                }
            }
        });
        
        // بدء إنتاج العناصر
        this.startSpawning();
        
        // إنشاء الأصوات
        this.createSounds();
        
        // تهيئة اللعبة للبداية 🎯
        this.initializeGame();
    }
    
    createBackground() {
        // خلفية متدرجة مع تأثيرات
        const bg = this.add.graphics();
        bg.fillGradientStyle(
            Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.light).color,
            Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.light).color,
            Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.secondary).color,
            Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.secondary).color,
            1
        );
        bg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        // إضافة عناصر زخرفية في الخلفية
        this.createBackgroundElements();
    }
    
    createBackgroundElements() {
        // دوائر زخرفية
        for (let i = 0; i < 8; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(2, Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.primary).color, 0.1);
            const x = Math.random() * GAME_CONFIG.width;
            const y = Math.random() * GAME_CONFIG.height;
            const radius = 20 + Math.random() * 40;
            circle.strokeCircle(x, y, radius);
            
            // تحريك بطيء
            this.tweens.add({
                targets: circle,
                y: y + 20,
                duration: 3000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    createPlayer() {
        // تحديد منطقة اللعب
        const gameAreaWidth = GAME_CONFIG.width - 180;
        
        // إنشاء اللاعب في وسط منطقة اللعب فقط
        this.player = this.physics.add.sprite(
            gameAreaWidth / 2, 
            GAME_CONFIG.height - 50, 
            'player'
        );
        
        // تحسينات فيزياء للاستجابة الصاروخية
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(70, 15); // تقليل منطقة التصادم قليلاً
        this.player.setGravityY(-400); // إلغاء تأثير الجاذبية على اللاعب
        this.player.body.setDrag(0); // إزالة أي مقاومة
        this.player.body.setMaxVelocity(0); // إيقاف السرعة التلقائية
        
        // 🎯 التأكد أن السلة تظهر فوق جميع العناصر
        this.player.setDepth(30);
        
        // تحديد حدود الحركة للاعب
        this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameAreaWidth, GAME_CONFIG.height));
    }
    
    createUI() {
        // خط فاصل عمودي بين منطقة اللعب والمعلومات
        const dividerLine = this.add.graphics();
        dividerLine.lineStyle(3, 0xc49b41, 0.8);
        dividerLine.beginPath();
        dividerLine.moveTo(GAME_CONFIG.width - 160, 0);
        dividerLine.lineTo(GAME_CONFIG.width - 160, GAME_CONFIG.height);
        dividerLine.strokePath();
        
        // === لوحة المعلومات اليمنى ===
        this.createRightInfoPanel();
    }
    
    createRightInfoPanel() {
        const panelX = GAME_CONFIG.width - 150;
        let currentY = 20;
        
        // خلفية اللوحة
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000000, 0.1);
        panelBg.fillRoundedRect(panelX - 10, 10, 140, GAME_CONFIG.height - 20, 10);
        
        // === 1. النقاط ===
        this.ui.scoreText = this.add.text(panelX, currentY, 'النقاط: 0', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: '600',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 35;
        
        // === 2. المستوى ===
        this.ui.levelText = this.add.text(panelX, currentY, 'المستوى: 1', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 35;
        
        // === 3. أكياس البطاطس (الأرواح) ===
        this.ui.livesLabel = this.add.text(panelX, currentY, 'أكياس البطاطس:', {
            fontFamily: 'Cairo, Arial',
            fontSize: '14px',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 25;
        
        this.ui.livesText = this.add.text(panelX, currentY, '🍟🍟🍟', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 40;
        
        // === 4. التقدم في البناء ===
        this.ui.progressTitle = this.add.text(panelX, currentY, '🍔 تقدم البرجر', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.accent
        });
        currentY += 30;
        
        // === 5. النسبة المئوية الكبيرة ===
        this.ui.discountPercentText = this.add.text(panelX, currentY, '0%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 50;
        
        // === 6. الجزء الحالي من السندوتش ===
        this.ui.currentPartText = this.add.text(panelX, currentY, 'الطبق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '14px',
            fontWeight: '600',
            color: GAME_CONFIG.colors.dark
        });
        currentY += 40;
        

        
        // === 8. مؤشر مستوى المخاطرة 🎯 ===
        this.ui.riskLevelTitle = this.add.text(panelX, currentY, '🎯 مستوى التحدي', {
            fontFamily: 'Cairo, Arial',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#e74c3c'
        });
        currentY += 25;
        
        this.ui.riskLevelText = this.add.text(panelX, currentY, 'مبتدئ 🟢', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px',
            fontWeight: '600',
            color: '#27ae60'
        });
        currentY += 20;
        
        this.ui.nextMilestoneText = this.add.text(panelX, currentY, 'القادم: 10%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '10px',
            color: GAME_CONFIG.colors.text
        });
        currentY += 30;
        
        // === 9. السندوتش المبني (في أسفل الصفحة) ===
        this.createMiniSandwich();
    }
    
    createMiniSandwich() {
        // السندوتش المبني (بدون عنوان، في أسفل الصفحة تماماً)
        this.ui.miniSandwichLayers = this.add.graphics();
    }
    
    createDiscountMeter() {
        // موقع بناء السندوتش (أعلى اليمين)
        const sandwichX = GAME_CONFIG.width - 70;
        const sandwichY = 90;
        
        // خلفية شفافة للسندوتش
        this.ui.sandwichBg = this.add.graphics();
        this.ui.sandwichBg.fillStyle(0x000000, 0.1);
        this.ui.sandwichBg.fillRoundedRect(sandwichX - 10, sandwichY - 10, 80, 220, 10);
        
        // إطار ذهبي حول منطقة السندوتش
        this.ui.sandwichBg.lineStyle(2, 0xc49b41);
        this.ui.sandwichBg.strokeRoundedRect(sandwichX - 10, sandwichY - 10, 80, 220, 10);
        
        // عنوان السندوتش
        this.ui.sandwichTitle = this.add.text(sandwichX + 30, sandwichY - 30, 'برجر برجستا', {
            fontFamily: 'Cairo, Arial',
            fontSize: '14px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        }).setOrigin(0.5, 0);
        
        // مستويات الجوائز مع أيقونات
        this.ui.reward30Icon = this.add.text(sandwichX - 25, sandwichY + 150, '🍟 30%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px',
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        this.ui.reward60Icon = this.add.text(sandwichX - 25, sandwichY + 90, '🍔 60%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px',
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        this.ui.reward100Icon = this.add.text(sandwichX - 25, sandwichY + 30, '🎉 100%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px',
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        // خطوط مستويات الجوائز
        this.ui.sandwichBg.lineStyle(1, 0x8b6914, 0.5);
        this.ui.sandwichBg.beginPath();
        this.ui.sandwichBg.moveTo(sandwichX - 5, sandwichY + 150);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 150);
        this.ui.sandwichBg.moveTo(sandwichX - 5, sandwichY + 90);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 90);
        this.ui.sandwichBg.moveTo(sandwichX - 5, sandwichY + 30);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 30);
        this.ui.sandwichBg.strokePath();
        
        // مكونات السندوتش (ستظهر تدريجياً)
        this.ui.sandwichLayers = this.add.graphics();
        
        // نص النسبة المئوية
        this.ui.discountPercentText = this.add.text(sandwichX + 30, sandwichY + 190, '0%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        }).setOrigin(0.5, 0);
    }
    
    updateDiscountMeter() {
        const discount = this.gameManager.discount;
        
        // تحديث النسبة المئوية
        this.ui.discountPercentText.setText(`${discount}%`);
        
        // تحديد الجزء الحالي من السندوتش
        let currentPart = 'الطبق';
        if (discount >= 5) currentPart = 'الخبز السفلي';
        if (discount >= 15) currentPart = 'الجبن الأول';
        if (discount >= 25) currentPart = 'اللحم الأول';
        if (discount >= 40) currentPart = 'الخس الطازج';
        if (discount >= 55) currentPart = 'الطماطم';
        if (discount >= 70) currentPart = 'اللحم الثاني';
        if (discount >= 85) currentPart = 'الجبن الذائب';
        if (discount >= 100) currentPart = 'الخبز العلوي المكتمل! 🎉';
        
        this.ui.currentPartText.setText(currentPart);
        
        // تحديث السندوتش المصغر
        this.updateMiniSandwich(discount);
        
        // تأثير النجاح الكامل عند 100%
        if (discount >= 100) {
            this.createCompleteBurgerEffect(GAME_CONFIG.width - 60, GAME_CONFIG.height - 50);
        }
        
        // تأثير وميض عند تحقيق إنجاز
        if (discount === 30 || discount === 60 || discount === 100) {
            this.ui.discountPercentText.setTint(0xffd700);
            this.tweens.add({
                targets: [this.ui.discountPercentText, this.ui.currentPartText],
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 400,
                yoyo: true,
                onComplete: () => {
                    this.ui.discountPercentText.clearTint();
                }
            });
        }
    }
    
    updateMiniSandwich(discount) {
        // إذا كان البرجر الذهبي مُعرضاً، لا نُظهر البرجر العادي
        if (this.goldenBurger && discount >= 100) {
            this.ui.miniSandwichLayers.clear();
            return;
        }
        
        // موقع السندوتش في وسط الجزء الأيمن من أسفل الصفحة
        const rightPanelWidth = 160; // عرض الجزء الأيمن
        const x = GAME_CONFIG.width - (rightPanelWidth / 2) - 30; // وسط الجزء الأيمن
        const y = GAME_CONFIG.height - 15;
        
        // مسح السندوتش السابق
        this.ui.miniSandwichLayers.clear();
        
        let currentY = y; // البداية من الأسفل
        
        // رسم برجر واقعي متدرج
        const burgerWidth = 80;  // عرض ثابت للبرجر
        const burgerCenterX = x + 25;  // مركز البرجر
        
        // 1. الطبق - قاعدة عريضة
        this.ui.miniSandwichLayers.fillStyle(0xf5f5f5);
        this.ui.miniSandwichLayers.fillEllipse(burgerCenterX, currentY + 4, 95, 8);
        this.ui.miniSandwichLayers.lineStyle(1, 0xd0d0d0);
        this.ui.miniSandwichLayers.strokeEllipse(burgerCenterX, currentY + 4, 95, 8);
        // ظل الطبق
        this.ui.miniSandwichLayers.fillStyle(0xe8e8e8);
        this.ui.miniSandwichLayers.fillEllipse(burgerCenterX, currentY + 6, 85, 4);
        
        // 2. الخبز السفلي (5%) - قاعدة البرجر
        if (discount >= 5) {
            currentY -= 12;
            // الخبز السفلي مقبب قليلاً
            this.ui.miniSandwichLayers.fillStyle(0xdaa520);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2, currentY, burgerWidth, 10, 5);
            // لون أغمق للعمق
            this.ui.miniSandwichLayers.fillStyle(0xb8860b);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2 + 2, currentY + 2, burgerWidth - 4, 6, 3);
            // ملمس الخبز
            this.ui.miniSandwichLayers.fillStyle(0xcd9b1d);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2 + 4, currentY + 4, burgerWidth - 8, 2, 1);
        }
        
        // 3. الجبن الأول (15%) - جبن منصهر ينسكب على الجوانب
        if (discount >= 15) {
            currentY -= 3;
            const cheeseWidth = burgerWidth - 8;
            // جبن أساسي
            this.ui.miniSandwichLayers.fillStyle(0xffd700);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheeseWidth/2, currentY, cheeseWidth, 2);
            // جبن منصهر يتدلى على الجوانب
            this.ui.miniSandwichLayers.fillStyle(0xffeb3b);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - cheeseWidth/2 - 4, currentY + 1, cheeseWidth + 8, 2, 2);
            // لمعة الجبن
            this.ui.miniSandwichLayers.fillStyle(0xffffe0, 0.7);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheeseWidth/2 + 2, currentY, cheeseWidth - 4, 1);
        }
        
        // 4. اللحم الأول (25%) - برجر مشوي سميك
        if (discount >= 25) {
            currentY -= 8;
            const pattyWidth = burgerWidth - 12;
            // اللحم الأساسي
            this.ui.miniSandwichLayers.fillStyle(0x8b4513);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - pattyWidth/2, currentY, pattyWidth, 7, 3);
            // خطوط الشواء العمودية
            this.ui.miniSandwichLayers.fillStyle(0x654321);
            for(let i = 0; i < 4; i++) {
                this.ui.miniSandwichLayers.fillRect(burgerCenterX - pattyWidth/2 + 5 + i * 12, currentY + 1, 1, 5);
            }
            // سطح محمر للحم
            this.ui.miniSandwichLayers.fillStyle(0xa0522d);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - pattyWidth/2 + 1, currentY + 1, pattyWidth - 2, 2, 1);
            // عصارة اللحم
            this.ui.miniSandwichLayers.fillStyle(0x654321, 0.5);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - pattyWidth/2 + 2, currentY + 5, pattyWidth - 4, 1, 1);
        }
        
        // 5. الخس (40%) - أوراق خس طازجة ومتموجة
        if (discount >= 40) {
            currentY -= 4;
            const lettuceWidth = burgerWidth - 6;
            // أوراق الخس بشكل طبيعي متموج
            this.ui.miniSandwichLayers.fillStyle(0x32cd32);
            // رسم أوراق متعددة بتموجات طبيعية
            for(let i = 0; i < 5; i++) {
                const waveX = burgerCenterX - lettuceWidth/2 + i * 12;
                const waveY = currentY + Math.sin(i * 0.8) * 1.5;
                this.ui.miniSandwichLayers.fillRoundedRect(waveX, waveY, 12, 3, 4);
            }
            // عروق الخس الفاتحة
            this.ui.miniSandwichLayers.fillStyle(0x90ee90);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - lettuceWidth/2 + 2, currentY + 1, lettuceWidth - 4, 1, 1);
            // خضرة داكنة للحواف
            this.ui.miniSandwichLayers.fillStyle(0x228b22);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - lettuceWidth/2, currentY, lettuceWidth, 1, 1);
        }
        
        // 6. الطماطم (55%) - شرائح طماطم واقعية
        if (discount >= 55) {
            currentY -= 5;
            const tomatoSlices = 4;
            const sliceSize = 8;
            // شرائح الطماطم الدائرية
            for(let i = 0; i < tomatoSlices; i++) {
                const sliceX = burgerCenterX - 24 + i * 16;
                // الشريحة الأساسية
                this.ui.miniSandwichLayers.fillStyle(0xff6347);
                this.ui.miniSandwichLayers.fillCircle(sliceX, currentY + 2, sliceSize);
                // الجزء الداخلي الفاتح
                this.ui.miniSandwichLayers.fillStyle(0xff7f7f);
                this.ui.miniSandwichLayers.fillCircle(sliceX, currentY + 2, sliceSize - 2);
                // البذور والأجزاء الجيلاتينية
                this.ui.miniSandwichLayers.fillStyle(0xffa500, 0.8);
                this.ui.miniSandwichLayers.fillCircle(sliceX - 2, currentY + 1, 1.5);
                this.ui.miniSandwichLayers.fillCircle(sliceX + 2, currentY + 3, 1.5);
                // بذور صغيرة
                this.ui.miniSandwichLayers.fillStyle(0xfffacd);
                this.ui.miniSandwichLayers.fillCircle(sliceX - 1, currentY + 2, 0.5);
                this.ui.miniSandwichLayers.fillCircle(sliceX + 1, currentY + 1, 0.5);
            }
        }
        
        // 7. اللحم الثاني (70%) - برجر أصغر إضافي
        if (discount >= 70) {
            currentY -= 7;
            const patty2Width = burgerWidth - 18;
            // اللحم الثاني أصغر
            this.ui.miniSandwichLayers.fillStyle(0x8b4513);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - patty2Width/2, currentY, patty2Width, 6, 3);
            // خطوط الشواء
            this.ui.miniSandwichLayers.fillStyle(0x654321);
            for(let i = 0; i < 3; i++) {
                this.ui.miniSandwichLayers.fillRect(burgerCenterX - patty2Width/2 + 4 + i * 10, currentY + 1, 1, 4);
            }
            // سطح محمر
            this.ui.miniSandwichLayers.fillStyle(0xa0522d);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - patty2Width/2 + 1, currentY + 1, patty2Width - 2, 2, 1);
        }
        
        // 8. الجبن الثاني (85%) - جبن شيدر منصهر
        if (discount >= 85) {
            currentY -= 2;
            const cheese2Width = burgerWidth - 10;
            // جبن شيدر برتقالي
            this.ui.miniSandwichLayers.fillStyle(0xff8c00);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheese2Width/2, currentY, cheese2Width, 2);
            // جبن منصهر متدلي
            this.ui.miniSandwichLayers.fillStyle(0xffa500);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - cheese2Width/2 - 3, currentY + 1, cheese2Width + 6, 2, 3);
            // لمعة الجبن
            this.ui.miniSandwichLayers.fillStyle(0xffffe0, 0.6);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheese2Width/2 + 1, currentY, cheese2Width - 2, 1);
        }
        
        // 9. الخبز العلوي (100%) - قمة البرجر مقببة
        if (discount >= 100) {
            currentY -= 14;
            const topBunWidth = burgerWidth - 5;
            // الخبز العلوي مقبب
            this.ui.miniSandwichLayers.fillStyle(0xd2691e);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - topBunWidth/2, currentY, topBunWidth, 12, 8);
            // قبة الخبز العلوي
            this.ui.miniSandwichLayers.fillStyle(0xcd853f);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - topBunWidth/2 + 2, currentY + 1, topBunWidth - 4, 8, 6);
            // لمعة الخبز
            this.ui.miniSandwichLayers.fillStyle(0xdaa520);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - topBunWidth/2 + 4, currentY + 2, topBunWidth - 8, 3, 3);
            
            // بذور السمسم موزعة بشكل طبيعي
            this.ui.miniSandwichLayers.fillStyle(0xfffacd);
            const sesameSeeds = [
                {x: burgerCenterX - 20, y: currentY + 6},
                {x: burgerCenterX - 8, y: currentY + 4},
                {x: burgerCenterX + 5, y: currentY + 7},
                {x: burgerCenterX + 18, y: currentY + 5},
                {x: burgerCenterX - 15, y: currentY + 8},
                {x: burgerCenterX + 12, y: currentY + 8},
                {x: burgerCenterX - 3, y: currentY + 9},
                {x: burgerCenterX + 25, y: currentY + 7}
            ];
            sesameSeeds.forEach(seed => {
                this.ui.miniSandwichLayers.fillEllipse(seed.x, seed.y, 2.5, 1.8);
            });
        }
    }
    
    createCompleteBurgerEffect(sandwichX, sandwichY) {
        // تأثير البرجر المكتمل - احتفال مذهل! 🍔
        
        // 1. انفجار من النجوم الذهبية الكبيرة
        for (let i = 0; i < 20; i++) {
            const star = this.add.graphics();
            const starColor = i % 2 === 0 ? 0xffd700 : 0xff6b35; // ذهبي وبرتقالي
            star.fillStyle(starColor);
            
            // رسم نجمة بحجم أكبر
            const starPoints = [];
            const centerX = 0;
            const centerY = 0;
            const outerRadius = 10 + Math.random() * 5;
            const innerRadius = 5 + Math.random() * 3;
            
            for (let j = 0; j < 10; j++) {
                const angle = (j * Math.PI) / 5;
                const radius = j % 2 === 0 ? outerRadius : innerRadius;
                starPoints.push(centerX + Math.cos(angle) * radius);
                starPoints.push(centerY + Math.sin(angle) * radius);
            }
            
            star.fillPoints(starPoints, true);
            star.setPosition(sandwichX + 35, sandwichY - 10);
            
            // حركة انفجارية متنوعة
            const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.5;
            const distance = 80 + Math.random() * 60;
            
            this.tweens.add({
                targets: star,
                x: sandwichX + 35 + Math.cos(angle) * distance,
                y: sandwichY - 10 + Math.sin(angle) * distance - 40,
                alpha: 0,
                scaleX: { from: 0.2, to: 1.5 },
                scaleY: { from: 0.2, to: 1.5 },
                rotation: Math.PI * 4 * (Math.random() > 0.5 ? 1 : -1),
                duration: 2000 + Math.random() * 1000,
                ease: 'Power3.easeOut',
                onComplete: () => star.destroy()
            });
        }
        
        // 2. دوائر ملونة متموجة
        const celebrationColors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xfd79a8];
        for (let i = 0; i < 6; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(6, celebrationColors[i], 0.8);
            circle.strokeCircle(0, 0, 25);
            circle.setPosition(sandwichX + 35, sandwichY - 10);
            
            this.tweens.add({
                targets: circle,
                scaleX: 5,
                scaleY: 5,
                alpha: 0,
                rotation: Math.PI * 2,
                duration: 2000,
                delay: i * 150,
                ease: 'Power2.easeOut',
                onComplete: () => circle.destroy()
            });
        }
        
        // 3. تأثير وميض للبرجر مع تكبير
        this.tweens.add({
            targets: this.ui.miniSandwichLayers,
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            alpha: { from: 1, to: 0.7 },
            duration: 200,
            yoyo: true,
            repeat: 4,
            ease: 'Power2'
        });
        
        // 4. جسيمات قلوب وإيموجي طعام
        const foodEmojis = ['❤️', '⭐', '💫', '✨'];
        for (let i = 0; i < 12; i++) {
            const emoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
            const emojiText = this.add.text(sandwichX + 35, sandwichY - 10, emoji, {
                fontSize: '20px'
            }).setOrigin(0.5);
            
            const emojiAngle = Math.random() * Math.PI * 2;
            const emojiDistance = 50 + Math.random() * 50;
            
            this.tweens.add({
                targets: emojiText,
                x: sandwichX + 35 + Math.cos(emojiAngle) * emojiDistance,
                y: sandwichY - 10 + Math.sin(emojiAngle) * emojiDistance - 30,
                alpha: 0,
                scale: { from: 0.5, to: 2 },
                rotation: Math.random() * Math.PI,
                duration: 1500,
                delay: Math.random() * 500,
                ease: 'Power3.easeOut',
                onComplete: () => emojiText.destroy()
            });
        }
        
        // 5. رسالة تهنئة متحركة
        const congratsText = this.add.text(sandwichX + 35, sandwichY - 80, '🍔 برجر مثالي! 🍔\n+100 نقطة!', {
            fontSize: '24px',
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#8B4513',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: congratsText,
            y: congratsText.y - 50,
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1.3 },
            duration: 800,
            ease: 'Back.easeOut'
        });
        
        this.tweens.add({
            targets: congratsText,
            alpha: 0,
            y: congratsText.y - 100,
            duration: 1500,
            delay: 1500,
            ease: 'Power2.easeIn',
            onComplete: () => congratsText.destroy()
        });
        
        // صوت احتفالي
        this.sounds.golden.play();
        
        // إضافة البرجر الذهبي المكتمل كتذكار
        this.createGoldenBurgerDisplay();
    }
    
    createGoldenBurgerDisplay() {
        // إزالة البرجر الذهبي السابق إن وُجد
        if (this.goldenBurger) {
            this.goldenBurger.destroy();
        }
        
        // إنشاء البرجر الذهبي المكتمل
        this.goldenBurger = this.add.graphics();
        
        // موقع البرجر في الجانب الأيمن
        const rightPanelWidth = 160;
        const x = GAME_CONFIG.width - (rightPanelWidth / 2) - 35;
        let currentY = GAME_CONFIG.height - 50;
        
        // رسم البرجر الذهبي المكتمل بتصميم منسق
        const goldenBurgerWidth = 80;
        const goldenBurgerCenterX = x + 35;
        
        // 1. الطبق الذهبي
        this.goldenBurger.fillStyle(0xffd700, 0.9);
        this.goldenBurger.fillEllipse(goldenBurgerCenterX, currentY + 4, 95, 8);
        this.goldenBurger.lineStyle(1, 0xffb347);
        this.goldenBurger.strokeEllipse(goldenBurgerCenterX, currentY + 4, 95, 8);
        
        // 2. الخبز السفلي الذهبي
        currentY -= 12;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenBurgerWidth/2, currentY, goldenBurgerWidth, 10, 5);
        this.goldenBurger.fillStyle(0xffb347);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenBurgerWidth/2 + 2, currentY + 2, goldenBurgerWidth - 4, 6, 3);
        // ملمس ذهبي
        this.goldenBurger.fillStyle(0xffdc73);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenBurgerWidth/2 + 4, currentY + 4, goldenBurgerWidth - 8, 2, 1);
        
        // 3. الجبن الذهبي المنصهر
        currentY -= 3;
        const goldenCheeseWidth = goldenBurgerWidth - 8;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRect(goldenBurgerCenterX - goldenCheeseWidth/2, currentY, goldenCheeseWidth, 2);
        this.goldenBurger.fillStyle(0xffeb3b);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenCheeseWidth/2 - 4, currentY + 1, goldenCheeseWidth + 8, 2, 2);
        
        // 4. اللحم الذهبي الأول
        currentY -= 8;
        const goldenPattyWidth = goldenBurgerWidth - 12;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenPattyWidth/2, currentY, goldenPattyWidth, 7, 3);
        this.goldenBurger.fillStyle(0xffb347);
        for(let i = 0; i < 4; i++) {
            this.goldenBurger.fillRect(goldenBurgerCenterX - goldenPattyWidth/2 + 5 + i * 12, currentY + 1, 1, 5);
        }
        this.goldenBurger.fillStyle(0xffdc73);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenPattyWidth/2 + 1, currentY + 1, goldenPattyWidth - 2, 2, 1);
        
        // 5. الخس الذهبي
        currentY -= 4;
        const goldenLettuceWidth = goldenBurgerWidth - 6;
        this.goldenBurger.fillStyle(0xffd700);
        for(let i = 0; i < 5; i++) {
            const waveX = goldenBurgerCenterX - goldenLettuceWidth/2 + i * 12;
            const waveY = currentY + Math.sin(i * 0.8) * 1.5;
            this.goldenBurger.fillRoundedRect(waveX, waveY, 12, 3, 4);
        }
        
        // 6. الطماطم الذهبية
        currentY -= 5;
        const goldenTomatoSlices = 4;
        for(let i = 0; i < goldenTomatoSlices; i++) {
            const sliceX = goldenBurgerCenterX - 24 + i * 16;
            this.goldenBurger.fillStyle(0xffd700);
            this.goldenBurger.fillCircle(sliceX, currentY + 2, 8);
            this.goldenBurger.fillStyle(0xffdc73);
            this.goldenBurger.fillCircle(sliceX, currentY + 2, 6);
        }
        
        // 7. اللحم الثاني الذهبي
        currentY -= 7;
        const goldenPatty2Width = goldenBurgerWidth - 18;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenPatty2Width/2, currentY, goldenPatty2Width, 6, 3);
        this.goldenBurger.fillStyle(0xffb347);
        for(let i = 0; i < 3; i++) {
            this.goldenBurger.fillRect(goldenBurgerCenterX - goldenPatty2Width/2 + 4 + i * 10, currentY + 1, 1, 4);
        }
        
        // 8. الجبن الثاني الذهبي
        currentY -= 2;
        const goldenCheese2Width = goldenBurgerWidth - 10;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRect(goldenBurgerCenterX - goldenCheese2Width/2, currentY, goldenCheese2Width, 2);
        this.goldenBurger.fillStyle(0xffeb3b);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenCheese2Width/2 - 3, currentY + 1, goldenCheese2Width + 6, 2, 3);
        
        // 9. الخبز العلوي الذهبي
        currentY -= 14;
        const goldenTopBunWidth = goldenBurgerWidth - 5;
        this.goldenBurger.fillStyle(0xffd700);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenTopBunWidth/2, currentY, goldenTopBunWidth, 12, 8);
        this.goldenBurger.fillStyle(0xffdc73);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenTopBunWidth/2 + 2, currentY + 1, goldenTopBunWidth - 4, 8, 6);
        this.goldenBurger.fillStyle(0xffeb3b);
        this.goldenBurger.fillRoundedRect(goldenBurgerCenterX - goldenTopBunWidth/2 + 4, currentY + 2, goldenTopBunWidth - 8, 3, 3);
        
        // بذور السمسم الذهبية
        this.goldenBurger.fillStyle(0xfffacd);
        const goldenSeeds = [
            {x: goldenBurgerCenterX - 20, y: currentY + 6},
            {x: goldenBurgerCenterX - 8, y: currentY + 4},
            {x: goldenBurgerCenterX + 5, y: currentY + 7},
            {x: goldenBurgerCenterX + 18, y: currentY + 5},
            {x: goldenBurgerCenterX - 15, y: currentY + 8},
            {x: goldenBurgerCenterX + 12, y: currentY + 8}
        ];
        goldenSeeds.forEach(seed => {
            this.goldenBurger.fillEllipse(seed.x, seed.y, 2.5, 1.8);
        });
        
        // تأثير لمعان ذهبي
        this.tweens.add({
            targets: this.goldenBurger,
            alpha: { from: 0.8, to: 1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    updateDiscountBar() {
        // استخدام الوعاء الجديد بدلاً من الشريط القديم
        this.updateDiscountMeter();
        
        // خلفية الشريط
        this.ui.discountBar.fillStyle(Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.dark).color, 0.5);
        this.ui.discountBar.fillRoundedRect(180, 45, 200, 20, 10);
        
        // الشريط المملوء
        const fillWidth = (this.gameManager.discount / 100) * 200;
        if (fillWidth > 0) {
            let color = GAME_CONFIG.colors.accent;
            if (this.gameManager.discount >= 60) color = GAME_CONFIG.colors.success;
            if (this.gameManager.discount >= 100) color = '#f1c40f';
            
            this.ui.discountBar.fillStyle(Phaser.Display.Color.HexStringToColor(color).color);
            this.ui.discountBar.fillRoundedRect(180, 45, fillWidth, 20, 10);
        }
    }
    
    setupControls() {
        // تحديد حدود منطقة اللعب
        const gameAreaWidth = GAME_CONFIG.width - 180; // منطقة اللعب فقط
        const minX = 40; // الحد الأدنى (نصف عرض اللاعب)
        const maxX = gameAreaWidth - 40; // الحد الأقصى
        
        // تحكم بالماوس
        // حركة فورية صاروخية للماوس - متابعة مستمرة
        this.input.on('pointermove', (pointer) => {
            if (this.player && !this.gameManager.gameOver && !this.gameManager.gameWon) {
                const targetX = Math.max(minX, Math.min(pointer.x, maxX));
                // تحديث فوري للموقع بدون أي تأخير
                this.player.x = targetX;
                this.player.body.x = targetX - this.player.displayOriginX * this.player.scaleX;
            }
        });
        
        // تحكم باللمس والنقر - حركة فورية صاروخية
        this.input.on('pointerdown', (pointer) => {
            if (this.player && !this.gameManager.gameOver && !this.gameManager.gameWon) {
                const targetX = Math.max(minX, Math.min(pointer.x, maxX));
                // تحديث فوري للموقع والـ physics body
                this.player.x = targetX;
                this.player.body.x = targetX - this.player.displayOriginX * this.player.scaleX;
            }
        });

        // تحكم بالمفاتيح للاستجابة الصاروخية
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }
    
    setupCollisions() {
        // تصادم اللاعب مع العناصر المتساقطة
        this.physics.add.overlap(this.player, this.fallingItems, this.collectItem, null, this);
    }
    
    collectItem(player, item) {
        // وضع علامة على أن العنصر تم جمعه
        item.isCollected = true;
        
        // إلغاء فحص السقوط إذا كان موجوداً
        if (item.dropChecker) {
            item.dropChecker.destroy();
        }
        
        // إزالة العنصر
        item.destroy();
        
        // معالجة حسب نوع العنصر
        switch (item.itemType) {
            case 'good':
                this.handleGoodSandwich();
                break;
            case 'golden':
                this.handleGoldenSandwich();
                break;
            case 'bad':
                this.handleBadItem();
                break;
        }
        
        // تحديث الواجهة
        this.updateUI();
        
        // فحص مستويات المخاطرة 🎯
        this.checkRiskLevels();
    }
    
    handleGoodSandwich() {
        this.gameManager.addDiscount(GAME_CONFIG.discount.goodSandwich);
        this.gameManager.score += 10;
        this.gameManager.goodCaught++;
        
        // تأثير بصري
        this.showFloatingText('+1%', GAME_CONFIG.colors.success);
        
        // صوت
        try {
            if (this.sounds && this.sounds.collect) {
                this.sounds.collect.play();
            }
        } catch (error) {
            // تجاهل أخطاء الأصوات
        }
    }
    
    handleGoldenSandwich() {
        this.gameManager.addDiscount(GAME_CONFIG.discount.goldenSandwich);
        this.gameManager.score += 50;
        this.gameManager.goldenCaught++;
        
        // تأثير بصري خاص
        this.showFloatingText('+3%', GAME_CONFIG.colors.accent, 1.5);
        this.createSpecialEffect(this.player.x, this.player.y);
        
        // صوت خاص
        try {
            if (this.sounds && this.sounds.golden) {
                this.sounds.golden.play();
            }
        } catch (error) {
            // تجاهل أخطاء الأصوات
        }
    }
    
    handleBadItem() {
        this.gameManager.addDiscount(GAME_CONFIG.discount.badItem);
        this.gameManager.loseLife();
        this.gameManager.badCaught++;
        
        // تأثير بصري سلبي
        this.showFloatingText('-2%', GAME_CONFIG.colors.danger);
        this.shakeScreen();
        
        // صوت سلبي
        try {
            if (this.sounds && this.sounds.bad) {
                this.sounds.bad.play();
            }
        } catch (error) {
            // تجاهل أخطاء الأصوات
        }
    }
    
    showFloatingText(text, color, scale = 1) {
        const floatingText = this.add.text(this.player.x, this.player.y - 30, text, {
            fontFamily: 'Cairo, Arial',
            fontSize: `${24 * scale}px`,
            fontWeight: 'bold',
            color: color
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: floatingText,
            y: floatingText.y - 80,
            alpha: 0,
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => floatingText.destroy()
        });
    }
    
    createSpecialEffect(x, y) {
        // تأثير انفجار ذهبي
        for (let i = 0; i < 10; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.accent).color);
            particle.fillCircle(0, 0, 3);
            particle.setPosition(x, y);
            
            const angle = (i / 10) * Math.PI * 2;
            const distance = 50 + Math.random() * 30;
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 800,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }
    
    shakeScreen() {
        this.cameras.main.shake(200, 0.01);
    }
    
    startSpawning() {
        this.spawnTimer = this.time.addEvent({
            delay: this.gameManager.getCurrentSpawnRate(),
            callback: this.spawnItem,
            callbackScope: this,
            loop: true
        });
    }
    
    spawnItem() {
        if (this.gameManager.gameOver || this.gameManager.gameWon) return;
        
        // 🌟 فحص السندوتش الذهبي الخاص
        this.checkSpecialGoldenSandwich();
        
        // تحديد منطقة اللعب (الجانب الأيسر فقط - قبل الخط الفاصل)
        const gameAreaWidth = GAME_CONFIG.width - 180; // ترك 180px للوحة البيانات
        
        // تحديد نوع العنصر (بدون سندوتشات ذهبية عادية)
        const currentDifficulty = this.getCurrentDifficultyLevel();
        
        // احتماليات بدون السندوتش الذهبي (السندوتش الذهبي حدث خاص منفصل)
        const badChance = Math.min(0.6, 0.35 + (currentDifficulty * 0.05)); // من 35% إلى 60%
        const goodChance = 1 - badChance; // باقي الاحتمال للعناصر الجيدة
        
        // إنتاج سندوتشات متدرج حسب الصعوبة
        let numItems;
        if (this.gameManager.discount < 10) {
            numItems = 1; // في البداية: سندوتش واحد بس
        } else if (this.gameManager.discount < 30) {
            numItems = Math.floor(Math.random() * 2) + 1; // 1-2 سندوتشات
        } else if (this.gameManager.discount < 50) {
            numItems = Math.floor(Math.random() * 3) + 1; // 1-3 سندوتشات
        } else {
            numItems = Math.floor(Math.random() * 4) + 2; // 2-5 سندوتشات (صعب!)
        }
        
        for (let i = 0; i < numItems; i++) {
            const x = Math.random() * (gameAreaWidth - 50) + 25;
            let itemType, texture;
            const rand = Math.random();
            
            // لا توجد سندوتشات ذهبية عادية - السندوتش الذهبي حدث خاص!
            if (rand < goodChance) {
                itemType = 'good';
                texture = 'goodSandwich';
            } else {
                itemType = 'bad';
                texture = 'badItem';
            }
            
            // إنشاء العنصر المتساقط
            this.createFallingItem(x, itemType, texture);
        }
    }
    
    checkSpecialGoldenSandwich() {
        // السندوتش الذهبي يظهر فقط عند مستويات المخاطرة (وليس تلقائياً)
        // هذه الدالة محجوزة لنظام المخاطرة
    }
    
    showGoldenSandwichWarning() {
        // تم إزالة التنبيه - المعلومة موجودة في رسالة الاختيار
        
        // صوت تحذيري فقط
        if (this.sounds && this.sounds.golden) {
            this.sounds.golden.play();
        }
    }
    
    launchSpecialGoldenSandwich() {
        // إطلاق السندوتش الذهبي بسرعة جنونية!
        const gameAreaWidth = GAME_CONFIG.width - 180;
        const x = Math.random() * (gameAreaWidth - 50) + 25;
        
        // إنشاء السندوتش الذهبي الخاص
        const goldenItem = this.physics.add.sprite(x, -30, 'goldenSandwich');
        goldenItem.itemType = 'golden';
        
        // سرعة جنونية! (أسرع 3 مرات من العادي)
        const crazySpeed = this.gameManager.getCurrentItemSpeed() * 3;
        goldenItem.setVelocityY(crazySpeed);
        
        // تأثيرات بصرية مميزة
        goldenItem.setScale(1.3); // أكبر من العادي
        goldenItem.setTint(0xffd700); // لون ذهبي مشرق
        
        // تأثير إشعاع ذهبي
        this.tweens.add({
            targets: goldenItem,
            alpha: 0.7,
            duration: 200,
            yoyo: true,
            repeat: -1
        });
        
        // نفس نظام التتبع المعتاد
        goldenItem.setCollideWorldBounds(true);
        goldenItem.body.onWorldBounds = true;
        goldenItem.hasDropped = false;
        goldenItem.isCollected = false;
        
        goldenItem.dropChecker = this.time.addEvent({
            delay: 100,
            repeat: -1,
            callback: () => {
                if (goldenItem && goldenItem.active && !goldenItem.isCollected && !goldenItem.hasDropped) {
                    if (goldenItem.y >= GAME_CONFIG.height - 20) {
                        goldenItem.hasDropped = true;
                        this.handleItemDropped(goldenItem);
                        if (goldenItem.dropChecker) {
                            goldenItem.dropChecker.destroy();
                        }
                    }
                }
            }
        });
        
        this.fallingItems.add(goldenItem);
        
        // رسالة للاعب
        this.showFloatingText('💫 السندوتش الذهبي!', '#ffd700', 2);
    }
    
    createFallingItem(x, itemType, texture) {
        // إنشاء العنصر المتساقط
        const item = this.physics.add.sprite(x, -30, texture);
        item.itemType = itemType;
        
        // 🎯 حل مشكلة الطبقات: السندويتشات الجيدة تظهر فوق السيئة دائماً
        if (itemType === 'good') {
            item.setDepth(20); // السندويتشات الجيدة في المقدمة
        } else if (itemType === 'golden') {
            item.setDepth(25); // الذهبية فوق كل شيء
        } else {
            item.setDepth(10); // السيئة في الخلف
        }
        
        // ✅ تحديد السرعة المباشرة للسقوط
        item.setVelocityY(this.gameManager.getCurrentItemSpeed());
        
        // ✅ تفعيل World Bounds للعناصر
        item.setCollideWorldBounds(true);
        item.body.onWorldBounds = true;
        
        // 🎯 معالجة فقدان الحياة عند سقوط السندوتشات الجيدة
        item.hasDropped = false; // تتبع حالة السقوط
        item.isCollected = false; // تتبع التجميع
        
        // إضافة فحص دوري لموقع العنصر
        item.dropChecker = this.time.addEvent({
            delay: 100, // فحص كل 100 مللي ثانية
            repeat: -1, // تكرار لانهائي
            callback: () => {
                // التحقق من أن العنصر ما زال موجوداً وانه سقط
                if (item && item.active && !item.isCollected && !item.hasDropped) {
                    
                    // 🎯 حل ذكي: إذا كان السندويتش جيد ومحاط بسيء، حرّكه للجانب
                    if (itemType === 'good' || itemType === 'golden') {
                        this.checkAndAdjustGoodItemPosition(item);
                    }
                    
                    // إذا وصل العنصر إلى أسفل الشاشة
                    if (item.y >= GAME_CONFIG.height - 20) {
                        item.hasDropped = true;
                        this.handleItemDropped(item);
                        if (item.dropChecker) {
                            item.dropChecker.destroy();
                        }
                    }
                }
            }
        });
        
        this.fallingItems.add(item);
        
        // تحديث معدل الظهور
        this.spawnTimer.delay = this.gameManager.getCurrentSpawnRate();
    }

    checkAndAdjustGoodItemPosition(goodItem) {
        // فحص إذا كان هناك عنصر سيء قريب جداً من السندويتش الجيد
        let needsAdjustment = false;
        const adjustmentDistance = 60; // المسافة التي نعتبرها "قريبة جداً"
        
        this.fallingItems.children.entries.forEach(otherItem => {
            if (otherItem !== goodItem && otherItem.active && (otherItem.itemType === 'bad')) {
                // حساب المسافة بين العنصرين
                const distance = Phaser.Math.Distance.Between(
                    goodItem.x, goodItem.y, 
                    otherItem.x, otherItem.y
                );
                
                // إذا كانوا قريبين جداً وفي نفس المنطقة العمودية تقريباً
                if (distance < adjustmentDistance && Math.abs(goodItem.y - otherItem.y) < 100) {
                    needsAdjustment = true;
                }
            }
        });
        
        // إذا احتاج تعديل، حرّك السندويتش الجيد قليلاً للجانب
        if (needsAdjustment && !goodItem.isBeingAdjusted) {
            goodItem.isBeingAdjusted = true;
            
            // اختر اتجاه الحركة (يمين أو يسار) بناءً على المساحة المتاحة
            const gameAreaWidth = GAME_CONFIG.width - 180;
            let targetX = goodItem.x;
            
            if (goodItem.x < gameAreaWidth / 2) {
                // إذا كان في النصف الأيسر، حركه يميناً
                targetX = Math.min(goodItem.x + 40, gameAreaWidth - 25);
            } else {
                // إذا كان في النصف الأيمن، حركه يساراً
                targetX = Math.max(goodItem.x - 40, 25);
            }
            
            // تحريك تدريجي ناعم
            this.tweens.add({
                targets: goodItem,
                x: targetX,
                duration: 300,
                ease: 'Power1.easeOut',
                onComplete: () => {
                    goodItem.isBeingAdjusted = false;
                }
            });
        }
    }
    
    updateUI() {
        // تحديث النصوص
        this.ui.scoreText.setText(`النقاط: ${this.gameManager.score}`);
        this.ui.levelText.setText(`المستوى: ${this.gameManager.level}`);
        
        // تحديث أكياس البطاطس (الأرواح)
        const friesLeft = '🍟'.repeat(Math.max(0, this.gameManager.lives));
        const friesLost = '�'.repeat(Math.max(0, Math.min(3, 3 - Math.max(0, this.gameManager.lives || 0))));
        this.ui.livesText.setText(`${friesLeft}${friesLost}`);
        
        // تحديث التقدم في البناء
        this.updateDiscountMeter();
        
        // تحديث المستوى
        this.gameManager.updateLevel();
        
        // تحديث مؤشر مستوى المخاطرة الحالي 🎯
        this.updateRiskLevelIndicator();
    }
    
    showAchievement(message) {
        const achievementBg = this.add.graphics();
        achievementBg.fillStyle(Phaser.Display.Color.HexStringToColor(GAME_CONFIG.colors.success).color, 0.9);
        achievementBg.fillRoundedRect(GAME_CONFIG.width / 2 - 150, 120, 300, 60, 15);
        
        const achievementText = this.add.text(GAME_CONFIG.width / 2, 150, message, {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.light,
            align: 'center'
        }).setOrigin(0.5);
        
        // تأثير ظهور واختفاء
        this.tweens.add({
            targets: [achievementBg, achievementText],
            alpha: 0,
            duration: 2000,
            delay: 1500,
            onComplete: () => {
                achievementBg.destroy();
                achievementText.destroy();
            }
        });
    }
    
    showDifficultyNotification(title, message) {
        // إنشاء container للإشعار منظم
        const notificationPopup = this.add.container(GAME_CONFIG.width / 2, 250);
        
        // خلفية الإشعار مع حدود
        const notificationBg = this.add.graphics();
        notificationBg.fillStyle(0xffa500, 0.95);
        notificationBg.lineStyle(4, 0xff6600, 1);
        notificationBg.fillRoundedRect(-220, -60, 440, 120, 20);
        notificationBg.strokeRoundedRect(-220, -60, 440, 120, 20);
        
        const titleText = this.add.text(0, -25, title, {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        
        const messageText = this.add.text(0, 15, message, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: 380 }
        }).setOrigin(0.5);
        
        // إضافة العناصر للـ container
        notificationPopup.add([notificationBg, titleText, messageText]);
        notificationPopup.setDepth(20);
        
        // تأثير نبضة وتلاشي للـ container
        this.tweens.add({
            targets: notificationPopup,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 300,
            yoyo: true,
            repeat: 1
        });
        
        this.tweens.add({
            targets: notificationPopup,
            alpha: 0,
            duration: 1500,
            delay: 2500,
            onComplete: () => {
                notificationPopup.destroy();
            }
        });
    }
    
    showLevelUp(level) {
        const levelText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2, `المستوى ${level}!`, {
            fontFamily: 'Cairo, Arial',
            fontSize: '48px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        }).setOrigin(0.5);
        
        levelText.setScale(0);
        this.tweens.add({
            targets: levelText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            onComplete: () => {
                this.tweens.add({
                    targets: levelText,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => levelText.destroy()
                });
            }
        });
    }
    
    showWinScreen(message) {
        // إيقاف اللعبة
        this.spawnTimer.paused = true;
        this.physics.pause();
        
        // إنشاء نافذة تهنئة منظمة
        const popup = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2);
        
        // خلفية معتمة لمنع التداخل
        const winBg = this.add.graphics();
        winBg.fillStyle(0x000000, 0.7);
        winBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        winBg.setDepth(10);
        
        // صندوق الرسالة مع خلفية
        const messageBox = this.add.graphics();
        messageBox.fillStyle(0xffffff, 0.95);
        messageBox.lineStyle(4, 0xc49b41, 1);
        messageBox.fillRoundedRect(-250, -120, 500, 240, 20);
        messageBox.strokeRoundedRect(-250, -120, 500, 240, 20);
        
        // نص التهنئة
        const titleText = this.add.text(0, -60, '🎉 مبروك! 🎉', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#c49b41',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        
        const messageText = this.add.text(0, 0, message, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333333',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: 400 }
        }).setOrigin(0.5);
        
        // إضافة العناصر للـ container
        popup.add([messageBox, titleText, messageText]);
        popup.setDepth(15);
        
        // إحصائيات
        const stats = [
            `النقاط النهائية: ${this.gameManager.score}`,
            `السندوتشات الجيدة: ${this.gameManager.goodCaught}`,
            `السندوتشات الذهبية: ${this.gameManager.goldenCaught}`,
            `المستوى: ${this.gameManager.level}`
        ];
        
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 40, stats.join('\n'), {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            color: GAME_CONFIG.colors.light,
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);
        
        // زر إعادة اللعب
        const restartBtn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 120, '🔄 العب مرة أخرى', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px',
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.accent,
            backgroundColor: GAME_CONFIG.colors.light,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        
        restartBtn.on('pointerdown', () => {
            this.resetGameCompletely();
            this.scene.restart();
        });
    }
    
    showGameOver() {
        // إيقاف اللعبة
        this.spawnTimer.paused = true;
        this.physics.pause();
        
        // خلفية الخسارة شفافة
        const gameOverBg = this.add.graphics();
        gameOverBg.fillStyle(0x000000, 0.2);
        gameOverBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        // إزالة صندوق الخسارة الملون - النصوص فقط فوق اللعبة مباشرة
        
        // نصوص الخسارة
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 80, '😔 انتهت اللعبة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        let finalMessage = '💔 لم تحصل على أي خصم - لأنك لم تنسحب في الوقت المناسب!';
        // عند الخسارة، لا يحصل اللاعب على أي خصم لأنه لم ينسحب
        // الخصم يُحصل عليه فقط عند الانسحاب الآمن أو الفوز الكامل
        
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 20, finalMessage, {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        
        // إحصائيات نهائية
        const finalStats = [
            `الخصم النهائي: ${this.gameManager.discount}%`,
            `النقاط: ${this.gameManager.score}`,
            `المستوى: ${this.gameManager.level}`,
            `💔 السندوتشات المفقودة: ${this.gameManager.sandwichesMissed}`
        ];
        
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 40, finalStats.join('\n'), {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);
        
        // زر إعادة اللعب
        const restartBtn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 120, '🔄 حاول مرة أخرى', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: GAME_CONFIG.colors.primary,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        
        restartBtn.on('pointerdown', () => {
            this.resetGameCompletely();
            this.scene.restart();
        });
    }
    
    createSounds() {
        // إنشاء أصوات وهمية أولاً لتجنب الأخطاء
        this.sounds = {
            collect: { play: () => {} },
            golden: { play: () => {} },
            bad: { play: () => {} }
        };
        
        // إنشاء أصوات بسيطة باستخدام Web Audio API
        try {
            let audioContext = null;
            
            // وظيفة إنشاء الأصوات (تُستدعى عند أول نقرة)
            const initializeAudio = () => {
                try {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // صوت جمع السندوتش
                    this.sounds.collect = {
                        play: () => {
                            if (!audioContext) return;
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();
                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
                            oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.1);
                            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                            oscillator.start(audioContext.currentTime);
                            oscillator.stop(audioContext.currentTime + 0.2);
                        }
                    };
                    
                    // صوت السندوتش الذهبي
                    this.sounds.golden = {
                        play: () => {
                            if (!audioContext) return;
                            const notes = [523, 659, 784, 1047];
                            notes.forEach((freq, index) => {
                                const oscillator = audioContext.createOscillator();
                                const gainNode = audioContext.createGain();
                                oscillator.connect(gainNode);
                                gainNode.connect(audioContext.destination);
                                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                                const startTime = audioContext.currentTime + (index * 0.1);
                                gainNode.gain.setValueAtTime(0.08, startTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                                oscillator.start(startTime);
                                oscillator.stop(startTime + 0.3);
                            });
                        }
                    };
                    
                    // صوت العنصر السيئ
                    this.sounds.bad = {
                        play: () => {
                            if (!audioContext) return;
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();
                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
                            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                            oscillator.start(audioContext.currentTime);
                            oscillator.stop(audioContext.currentTime + 0.3);
                        }
                    };
                } catch (error) {
                    // تجاهل الأخطاء الصوتية
                }
            };
            
            // تفعيل الأصوات عند أول تفاعل مع المستخدم
            this.input.once('pointerdown', initializeAudio);
            
        } catch (error) {
            // الأصوات غير مدعومة - استخدام أصوات وهمية فقط
        }
    }
    
    update() {
        // تحكم صاروخي بالمفاتيح للاستجابة الفورية
        if (this.player && !this.gameManager.gameOver && !this.gameManager.gameWon) {
            const gameAreaWidth = GAME_CONFIG.width - 180;
            const speed = GAME_CONFIG.player.speed;
            
            // حركة يسار ويمين بالمفاتيح
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                this.player.x = Math.max(25, this.player.x - speed);
            }
            if (this.cursors.right.isDown || this.wasd.D.isDown) {
                this.player.x = Math.min(gameAreaWidth - 25, this.player.x + speed);
            }
        }
        
        // تنظيف العناصر التي تخرج من منطقة اللعب أو الشاشة
        const gameAreaWidth = GAME_CONFIG.width - 180;
        
        this.fallingItems.children.entries.forEach(item => {
            // حذف العناصر التي خرجت من الأسفل أو دخلت منطقة البيانات
            if (item.y > GAME_CONFIG.height + 50 || item.x > gameAreaWidth) {
                this.fallingItems.remove(item);
                item.destroy();
            }
        });
    }
    
    // ===== نظام المخاطرة والمراحل 🎯 =====
    
    checkRiskLevels() {
        // إذا كنا في وضع المخاطرة، لا نفحص مرة أخرى
        if (this.gameManager.isInRiskMode) return;
        
        // فحص كل مستوى لمعرفة إذا تم الوصول إليه
        for (const level of RISK_LEVELS) {
            if (!level.reached && this.gameManager.discount >= level.percent) {
                level.reached = true;
                this.triggerRiskMode(level);
                break; // نتوقف عند أول مستوى جديد
            }
        }
    }
    
    triggerRiskMode(level) {
        // إيقاف اللعبة مؤقتاً
        this.gameManager.isInRiskMode = true;
        this.gameManager.currentRiskLevel = level;
        this.spawnTimer.paused = true;
        this.physics.pause();
        
        // عرض شاشة المخاطرة
        this.showRiskDialog(level);
        
        // تشغيل صوت إنجاز
        this.sounds.golden.play();
    }
    
    showRiskDialog(level) {
        // إنشاء خلفية معتمة أكثر مع عمق محدد
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x000000, 0.8);
        dialogBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        dialogBg.setDepth(50);

        // نصوص الحوار في أعلى الصفحة
        const centerX = GAME_CONFIG.width / 2;
        const baseY = GAME_CONFIG.height / 2;

        // رسالة مبروك مبسطة
        const titleText = this.add.text(centerX, 150, '🎉 مبروك!', {
            fontSize: '40px',
            fill: '#ffff00',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        titleText.setDepth(55);

        // رسالة ماذا تقرر مبسطة
        const choiceText = this.add.text(centerX, 220, 'ماذا تقرر؟', {
            fontSize: '28px',
            fill: '#ffdd44',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        choiceText.setDepth(55);



        // عد تنازلي للقرار - في الأسفل أكثر
        let countdown = 15;
        const countdownText = this.add.text(centerX, GAME_CONFIG.height - 120, `⏰ الوقت المتبقي: ${countdown} ثانية`, {
            fontSize: '18px',
            fill: '#ffaa00',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);
        countdownText.setDepth(55);

        // مؤقت العد التنازلي
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            repeat: 14,
            callback: () => {
                countdown--;
                countdownText.setText(`⏰ الوقت المتبقي: ${countdown} ثانية`);
                
                // تغيير لون العد عند قرب الانتهاء
                if (countdown <= 5) {
                    countdownText.setFill('#ff0000');
                    countdownText.setScale(1.1);
                } else if (countdown <= 10) {
                    countdownText.setFill('#ff6600');
                }
                
                // إذا انتهى العد التنازلي، المواصلة تلقائياً
                if (countdown <= 0) {
                    this.continuePlaying(level);
                    // إزالة عناصر الحوار
                    dialogBg.destroy();
                    titleText.destroy();
                    rewardText.destroy();
                    questionText.destroy();
                    choiceText.destroy();
                    countdownText.destroy();
                    withdrawBtn.destroy();
                    continueBtn.destroy();
                }
            }
        });

        // أزرار الاختيار في أسفل الشاشة
        const withdrawBtn = this.add.text(centerX - 150, GAME_CONFIG.height - 80, '💰 انسحب الآن', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { x: 15, y: 8 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        withdrawBtn.setDepth(60);

        const continueBtn = this.add.text(centerX + 150, GAME_CONFIG.height - 80, '🔥 أكمل اللعب', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { x: 15, y: 8 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        continueBtn.setDepth(60);

        // تأثيرات تفاعلية محسنة للأزرار
        withdrawBtn.on('pointerover', () => { 
            withdrawBtn.setScale(1.15); 
            withdrawBtn.setFill('#00ff00');
            if (this.sounds && this.sounds.collect) this.sounds.collect.play(); 
        });
        withdrawBtn.on('pointerout', () => { 
            withdrawBtn.setScale(1); 
            withdrawBtn.setFill('#ffffff');
        });

        continueBtn.on('pointerover', () => { 
            continueBtn.setScale(1.15); 
            continueBtn.setFill('#ff3300');
            if (this.sounds && this.sounds.collect) this.sounds.collect.play(); 
        });
        continueBtn.on('pointerout', () => { 
            continueBtn.setScale(1); 
            continueBtn.setFill('#ffffff');
        });

        // معالجة النقر على الأزرار
        withdrawBtn.on('pointerdown', () => {
            // إيقاف العد التنازلي
            countdownTimer.destroy();
            this.takeReward(level);
            // إزالة عناصر الحوار
            dialogBg.destroy();
            titleText.destroy();
            rewardText.destroy();
            questionText.destroy();
            choiceText.destroy();
            countdownText.destroy();
            withdrawBtn.destroy();
            continueBtn.destroy();
        });

        continueBtn.on('pointerdown', () => {
            // إيقاف العد التنازلي
            countdownTimer.destroy();
            this.continuePlaying(level);
            // إزالة عناصر الحوار
            dialogBg.destroy();
            titleText.destroy();
            rewardText.destroy();
            questionText.destroy();
            choiceText.destroy();
            countdownText.destroy();
            withdrawBtn.destroy();
            continueBtn.destroy();
        });

        // حفظ مراجع للحوار لحذفه لاحقاً
        this.currentDialog = {
            bg: dialogBg,
            box: null,
            texts: [titleText, choiceText, countdownText],
            buttons: [withdrawBtn, continueBtn],
            timer: countdownTimer
        };
    }
    
    takeReward(level) {
        // اللاعب اختار الانسحاب والحصول على المكافأة
        this.sounds.golden.play();
        
        // إيقاف اللعبة نهائياً
        this.gameManager.isInRiskMode = false;
        this.gameManager.gameWon = true;
        this.spawnTimer.paused = true;
        this.physics.pause();
        
        // عرض شاشة التهنئة والمكافأة
        this.showRewardScreen(level);
    }
    
    continuePlaying(level) {
        // اللاعب اختار المواصلة والمخاطرة
        this.gameManager.isInRiskMode = false;
        
        // زيادة الصعوبة حسب المستوى
        this.increaseDifficulty(level.difficulty);
        
        // استئناف اللعبة
        this.spawnTimer.paused = false;
        this.physics.resume();
        
        // تشغيل صوت المواصلة
        this.sounds.bad.play(); // صوت تحذيري
        
        // 🌟 إطلاق السندوتش الذهبي كمكافأة للمخاطرة!
        this.launchRiskGoldenSandwich(level);
        
        // عرض رسالة تشجيعية
        this.showEncouragementMessage(level);
    }
    
    launchRiskGoldenSandwich(level) {
        // فحص إذا كان السندوتش الذهبي لهذا المستوى تم إطلاقه من قبل
        if (this.gameManager.riskGoldenSandwiches[level.percent]) {
            return; // لا نطلق نفس السندوتش مرتين
        }
        
        // تسجيل أن السندوتش تم إطلاقه
        this.gameManager.riskGoldenSandwiches[level.percent] = true;
        
        // إطلاق السندوتش الذهبي فوراً بسرعة متناسبة مع مستوى المخاطرة
        this.time.addEvent({
            delay: 1000, // ثانية واحدة فقط للبدء
            callback: () => {
                const gameAreaWidth = GAME_CONFIG.width - 180;
                const x = Math.random() * (gameAreaWidth - 50) + 25;
                
                // إنشاء السندوتش الذهبي
                const goldenItem = this.physics.add.sprite(x, -30, 'goldenSandwich');
                goldenItem.itemType = 'golden';
                
                // السرعة تزيد حسب مستوى المخاطرة!
                let speedMultiplier;
                switch(level.percent) {
                    case 10: speedMultiplier = 2.5; break;    // سريع جداً
                    case 25: speedMultiplier = 3.5; break;    // أسرع جداً  
                    case 50: speedMultiplier = 4.5; break;    // جنوني
                    case 75: speedMultiplier = 6.0; break;    // صاروخ!
                    default: speedMultiplier = 2.0; break;
                }
                
                const crazySpeed = this.gameManager.getCurrentItemSpeed() * speedMultiplier;
                goldenItem.setVelocityY(crazySpeed);
                
                // تأثيرات بصرية حسب المستوى
                goldenItem.setScale(1.2 + (level.difficulty * 0.1)); // يكبر كل مستوى
                goldenItem.setTint(0xffd700);
                
                // تأثير إشعاع متسارع حسب المستوى
                this.tweens.add({
                    targets: goldenItem,
                    alpha: 0.5,
                    duration: Math.max(100, 300 - (level.difficulty * 40)), // وميض أسرع كل مستوى
                    yoyo: true,
                    repeat: -1
                });
                
                // نظام التتبع المعتاد
                goldenItem.setCollideWorldBounds(true);
                goldenItem.body.onWorldBounds = true;
                goldenItem.hasDropped = false;
                goldenItem.isCollected = false;
                
                goldenItem.dropChecker = this.time.addEvent({
                    delay: 50, // فحص أسرع للسندوتشات السريعة
                    repeat: -1,
                    callback: () => {
                        if (goldenItem && goldenItem.active && !goldenItem.isCollected && !goldenItem.hasDropped) {
                            if (goldenItem.y >= GAME_CONFIG.height - 20) {
                                goldenItem.hasDropped = true;
                                this.handleItemDropped(goldenItem);
                                if (goldenItem.dropChecker) {
                                    goldenItem.dropChecker.destroy();
                                }
                            }
                        }
                    }
                });
                
                this.fallingItems.add(goldenItem);
                
                // رسالة مثيرة
                this.showFloatingText(`💫 سندوتش ${level.percent}%!`, '#ffd700', 2);
            }
        });
    }
    
    increaseDifficulty(difficulty) {
        // زيادة سرعة السقوط
        const speedMultiplier = 1 + (difficulty * 0.3);
        
        // تقليل زمن الظهور (سرعة أكبر في الظهور)
        const currentDelay = this.spawnTimer.delay;
        this.spawnTimer.delay = Math.max(300, currentDelay - (difficulty * 200));
        
        // زيادة نسبة العناصر السيئة
        // هذا سيتم تطبيقه في دالة spawnItem
        
        console.log(`🔥 الصعوبة زادت! المستوى: ${difficulty}`);
    }
    
    showRewardScreen(level) {
        // إيقاف اللعبة نهائياً
        this.spawnTimer.paused = true;
        this.physics.pause();
        this.gameManager.gameWon = true;
        
        // خلفية الفوز شفافة
        const winBg = this.add.graphics();
        winBg.fillStyle(0x27ae60, 0.3);
        winBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        
        // رسالة التهنئة
        const congratsText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 100, 
            `🎉 مبروك! 🎉\n${level.reward}`, {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center',
            stroke: '#27ae60',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // رسالة عرض الخصم
        const discountText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2, 
            'أظهر هذه الشاشة في المطعم\nلاستلام خصمك', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);
        
        // رقم الخصم بارز
        const discountCode = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 80, 
            `كود الخصم: BURGSTA${level.percent}`, {
            fontSize: '24px',
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            backgroundColor: '#27ae60',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);
        
        // زر إعادة اللعب
        const restartBtn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 150, 
            '🔄 العب مرة أخرى', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#8B4513',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        
        restartBtn.on('pointerdown', () => {
            // إعادة تعيين كل شيء للعبة جديدة
            this.resetGameCompletely();
            this.scene.restart();
        });
    }
    
    showEncouragementMessage(level) {
        const encourageText = this.add.text(GAME_CONFIG.width / 2, 100, 
            '🔥 تحدي جديد بدأ! حظاً موفقاً', {
            fontSize: '20px',
            fill: '#e74c3c',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            backgroundColor: '#ffffff',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);
        
        // إخفاء الرسالة بعد 3 ثوان
        this.tweens.add({
            targets: encourageText,
            alpha: 0,
            y: 50,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => encourageText.destroy()
        });
    }
    
    getCurrentDifficultyLevel() {
        // حساب مستوى الصعوبة الحالي بناء على المراحل المكتملة
        let difficulty = 1;
        for (const level of RISK_LEVELS) {
            if (level.reached) {
                difficulty = Math.max(difficulty, level.difficulty);
            }
        }
        return difficulty;
    }
    
    handleItemDropped(item) {
        // التأكد من أن العنصر لم يُجمع من قبل
        if (item.isCollected) {
            return; // تجاهل إذا تم جمعه مسبقاً
        }
        
        // إلغاء فحص السقوط إذا كان موجوداً  
        if (item.dropChecker) {
            item.dropChecker.destroy();
        }
        
        // معالجة سقوط العناصر بدون التقاطها
        if (item.itemType === 'good' || item.itemType === 'golden') {
            // 💔 خسارة حياة عند فقدان سندوتش جيد أو ذهبي
            this.gameManager.lives = Math.max(0, this.gameManager.lives - 1); // حماية من القيم السالبة
            this.gameManager.sandwichesMissed++; // تسجيل السندوتش المفقود
            
            // تشغيل صوت فقدان الحياة
            try {
                if (this.sounds && this.sounds.bad) {
                    this.sounds.bad.play();
                }
            } catch (error) {
                // تجاهل أخطاء الأصوات
            }
            
            // تأثير بصري لفقدان الحياة
            this.showLifeLossEffect(item.x, item.y);
            
            // عرض رسالة تحذيرية
            this.showMissedSandwichWarning(item.itemType);
            
            // فحص انتهاء اللعبة
            if (this.gameManager.lives <= 0) {
                this.gameManager.gameOver = true;
                this.showGameOver();
            }
        } else if (item.itemType === 'bad') {
            // ✅ سقوط العناصر السيئة أمر جيد! لا خسارة حياة
            this.showGoodAvoidanceEffect(item.x, item.y);
        }
        
        // إزالة العنصر من المجموعة قبل التدمير
        if (this.fallingItems && this.fallingItems.contains(item)) {
            this.fallingItems.remove(item);
        }
        
        // إزالة العنصر
        item.destroy();
        
        // تحديث الواجهة
        this.updateUI();
    }
    
    showGoodAvoidanceEffect(x, y) {
        // تأثير إيجابي عند تجنب العناصر السيئة
        const goodText = this.add.text(x, y, '✅ تجنب ذكي!', {
            fontSize: '16px',
            fill: '#27ae60',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // حركة للأعلى مع التلاشي
        this.tweens.add({
            targets: goodText,
            y: y - 40,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => goodText.destroy()
        });
    }
    
    showLifeLossEffect(x, y) {
        // تأثير بصري عند فقدان الحياة
        const lossText = this.add.text(x, y, '💔 -1', {
            fontSize: '20px',
            fill: '#e74c3c',
            fontFamily: 'Arial Black',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // حركة النص للأعلى مع التلاشي
        this.tweens.add({
            targets: lossText,
            y: y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => lossText.destroy()
        });
        
        // تأثير دوائر حمراء متوسعة
        for (let i = 0; i < 3; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(3, 0xe74c3c, 0.7);
            circle.strokeCircle(0, 0, 10);
            circle.x = x;
            circle.y = y;
            
            this.tweens.add({
                targets: circle,
                scaleX: 3 + i,
                scaleY: 3 + i,
                alpha: 0,
                duration: 800,
                delay: i * 100,
                ease: 'Power2',
                onComplete: () => circle.destroy()
            });
        }
    }
    
    showMissedSandwichWarning(itemType) {
        const warningMessages = {
            'good': '⚠️ فوتك سندوتش جيد!',
            'golden': '💀 فوتك سندوتش ذهبي!'
        };
        
        const colors = {
            'good': '#e67e22',
            'golden': '#e74c3c'
        };
        
        const warningText = this.add.text(GAME_CONFIG.width / 2, 150, warningMessages[itemType], {
            fontSize: '22px',
            fill: colors[itemType],
            fontFamily: 'Arial Black',
            backgroundColor: '#ffffff',
            padding: { x: 15, y: 8 },
            stroke: colors[itemType],
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // تأثير اهتزاز للتحذير
        this.tweens.add({
            targets: warningText,
            x: GAME_CONFIG.width / 2 + 5,
            duration: 100,
            yoyo: true,
            repeat: 5,
            ease: 'Power2'
        });
        
        // إخفاء بعد 3 ثوان
        this.tweens.add({
            targets: warningText,
            alpha: 0,
            y: 100,
            duration: 2000,
            delay: 1000,
            ease: 'Power2',
            onComplete: () => warningText.destroy()
        });
    }
    
    updateRiskLevelIndicator() {
        if (!this.ui.riskLevelText) return;
        
        const currentDifficulty = this.getCurrentDifficultyLevel();
        const currentDiscount = this.gameManager.discount;
        
        // تحديد النص والرموز حسب المستوى
        let levelText = '';
        let levelColor = '';
        
        switch (currentDifficulty) {
            case 1:
                levelText = 'مبتدئ 🟢';
                levelColor = '#27ae60';
                break;
            case 2:
                levelText = 'متوسط 🟡';
                levelColor = '#f39c12';
                break;
            case 3:
                levelText = 'صعب 🟠';
                levelColor = '#e67e22';
                break;
            case 4:
                levelText = 'خطر 🔴';
                levelColor = '#e74c3c';
                break;
            case 5:
                levelText = 'مستحيل 🔥';
                levelColor = '#8e44ad';
                break;
        }
        
        this.ui.riskLevelText.setText(levelText);
        this.ui.riskLevelText.setColor(levelColor);
        
        // تأثير وميض عند تغيير المستوى
        if (this.previousDifficulty !== currentDifficulty) {
            this.tweens.add({
                targets: this.ui.riskLevelText,
                scaleX: { from: 1, to: 1.3 },
                scaleY: { from: 1, to: 1.3 },
                duration: 300,
                yoyo: true,
                ease: 'Power2'
            });
            this.previousDifficulty = currentDifficulty;
        }
        
        // تحديد المحطة القادمة
        let nextMilestone = '';
        for (const level of RISK_LEVELS) {
            if (!level.reached && currentDiscount < level.percent) {
                nextMilestone = `القادم: ${level.percent}%`;
                break;
            }
        }
        
        if (!nextMilestone) {
            nextMilestone = 'اكتملت كل المراحل! 🏆';
        }
        
        this.ui.nextMilestoneText.setText(nextMilestone);
    }
    
    resetGameCompletely() {
        try {
            // إعادة تعيين جميع مستويات المخاطرة
            RISK_LEVELS.forEach(lvl => lvl.reached = false);
            
            // إعادة تعيين حالة اللعبة (مع التحقق من وجود gameManager)
            if (this.gameManager) {
                this.gameManager.isInRiskMode = false;
                this.gameManager.currentRiskLevel = null;
                this.gameManager.gameOver = false;
                this.gameManager.gameWon = false;
                
                // إعادة تعيين الإحصائيات
                this.gameManager.score = 0;
                this.gameManager.discount = 0;
                this.gameManager.level = 1;
                this.gameManager.lives = 3;
                this.gameManager.goodCaught = 0;
                this.gameManager.badCaught = 0;
                this.gameManager.goldenCaught = 0;
                this.gameManager.sandwichesMissed = 0;
                
                // إعادة تعيين السندوتشات الذهبية للمخاطرة 🌟
                this.gameManager.riskGoldenSandwiches = {
                    10: false, 25: false, 50: false, 75: false
                };
            }
            
            // إعادة تعيين مستوى الصعوبة
            this.previousDifficulty = 1;
            
            // إزالة البرجر الذهبي إن وجد
            if (this.goldenBurger) {
                this.goldenBurger.destroy();
                this.goldenBurger = null;
            }
            
            // تنظيف جميع العناصر المتساقطة المتبقية (مع فحص أكثر دقة)
            if (this.fallingItems && typeof this.fallingItems.clear === 'function') {
                this.fallingItems.clear(true, true);
            }
            
            // إعادة تعيين spawnTimer
            if (this.spawnTimer) {
                this.spawnTimer.paused = false;
                if (GAME_CONFIG.items && GAME_CONFIG.items.baseSpawnRate) {
                    this.spawnTimer.delay = GAME_CONFIG.items.baseSpawnRate;
                } else {
                    this.spawnTimer.delay = 1500; // قيمة افتراضية
                }
            }
            
            // إستئناف الفيزياء (في حالة كانت متوقفة)
            if (this.physics) {
                this.physics.resume();
            }
            
            console.log('🔄 تم إعادة تعيين اللعبة بالكامل');
        } catch (error) {
            console.error('❌ خطأ أثناء إعادة تعيين اللعبة:', error);
            // في حالة الخطأ، لا نفعل شيئاً لتجنب توقف اللعبة
        }
    }
    
    initializeGame() {
        // تهيئة اللعبة في البداية (بدون تدمير العناصر الموجودة)
        try {
            // إعادة تعيين جميع مستويات المخاطرة
            RISK_LEVELS.forEach(lvl => lvl.reached = false);
            
            // تهيئة مستوى الصعوبة
            this.previousDifficulty = 1;
            
            // التأكد من حالة gameManager
            if (this.gameManager) {
                this.gameManager.isInRiskMode = false;
                this.gameManager.currentRiskLevel = null;
            }
            
            console.log('🎮 تم تهيئة اللعبة للبداية');
        } catch (error) {
            console.error('❌ خطأ أثناء تهيئة اللعبة:', error);
        }
    }
}

// إعداد وتشغيل اللعبة
const gameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    backgroundColor: GAME_CONFIG.colors.secondary,
    parent: 'gameContainer',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }, // ✅ جاذبية أقوى للسقوط الطبيعي
            debug: false
        }
    },
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// تشغيل اللعبة عند تحميل الصفحة
window.addEventListener('load', () => {
    const game = new Phaser.Game(gameConfig);
    window.game = game;
    
    // إخفاء شاشة التحميل عند جاهزية اللعبة
    setTimeout(() => {
        document.querySelector('.loading').style.display = 'none';
    }, 1000);
});

// تعديل حجم اللعبة عند تغيير حجم النافذة
window.addEventListener('resize', () => {
    if (window.game) {
        window.game.scale.refresh();
    }
});