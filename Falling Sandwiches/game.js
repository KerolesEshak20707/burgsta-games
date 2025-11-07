// ===== لعبة السندوتشات المتساقطة - Burgsta =====

// إعدادات اللعبة
const GAME_CONFIG = {
    // أبعاد اللعبة - دقة HD
    width: 1280,
    height: 720,
    
    // إعدادات اللاعب
    player: {
        speed: 45,  // سرعة متوازنة ومريحة 😊
        size: 40    // حجم مناسب للدقة HD
    },
    
    // إعدادات السندوتشات - متوازنة مع الأحجام الكبيرة 🔥🔥
    items: {
        baseSpeed: 90,         // سرعة متوازنة - مريحة في البداية �
        speedIncrement: 30,    // زيادة سريعة للإثارة
        baseSpawnRate: 1200,   // بداية مريحة ومتوازنة �
        spawnRateDecrement: 80, // تسارع تدريجي
        minSpawnRate: 300      // حد أدنى معقول للتحدي النهائي ⚡
    },
    
    // نظام الخصم - للمحترفين فقط! 🔥
    discount: {
        goodSandwich: 0.2,  // +0.2% لكل سندوتش جيد (أصعب للحصول على خصم!)
        goldenSandwich: 1.0,  // +1.0% للسندوتش الذهبي (أقل كرم!)
        badItem: -2.0,      // -2.0% للعناصر السيئة (عقاب أقسى!)
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
        percent: 5, 
        message: "خصم 5%", 
        difficulty: 0.5,
        reached: false,
        description: "مبروك! وصلت للمستوى الأول",
        reward: "تهنئة! إنجاز رائع + فرصة ساندوتش ذهبي خاص + عودة للصعوبة الطبيعية",
        nextRisk: "ستعود اللعبة للصعوبة الطبيعية..."
    },
    { 
        percent: 10, 
        message: "خصم 10%", 
        difficulty: 1,
        reached: false,
        description: "مبروك! وصلت للمستوى الثاني",
        reward: "إنجاز ممتاز! + سندويتش ذهبي سريع",
        nextRisk: "الصعوبة ستزيد قليلاً..."
    },
    { 
        percent: 25, 
        message: "خصم 25%", 
        difficulty: 2,
        reached: false,
        description: "ممتاز! مستوى متقدم",
        reward: "إنجاز رائع جداً! + سندويتش ذهبي أسرع", 
        nextRisk: "سرعة أكبر وعناصر سيئة أكثر!"
    },
    { 
        percent: 50, 
        message: "خصم 50%", 
        difficulty: 3,
        reached: false,
        description: "رائع جداً! نصف الطريق",
        reward: "إنجاز خيالي! + سندويتش ذهبي فائق السرعة",
        nextRisk: "تحدي شديد في انتظارك..."
    },
    { 
        percent: 75, 
        message: "خصم 75%", 
        difficulty: 4,
        reached: false,
        description: "إنجاز استثنائي!",
        reward: "خصم ثلاثة أرباع السعر + سندويتش ذهبي صاروخي",
        nextRisk: "المرحلة الأخيرة... صعبة جداً!"
    },
    { 
        percent: 100, 
        message: "وجبة مجانية كاملة!", 
        difficulty: 5,
        reached: false,
        description: "المستوى الأسطوري!",
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
            5: false,   // هل تم إطلاق سندوتش 5%؟
            10: false,  // هل تم إطلاق سندوتش 10%؟
            25: false,  // هل تم إطلاق سندوتش 25%؟
            50: false,  // هل تم إطلاق سندوتش 50%؟
            75: false   // هل تم إطلاق سندوتش 75%؟
        };
        
        // 🎁 نظام الساندوتش المجاني الكامل (جديد!)
        this.initializeFreeSandwichSystem();
        
        // إحصائيات
        this.goodCaught = 0;
        this.badCaught = 0;
        // تم حذف goldenCaught - نستخدم النظام الموحد فقط
        this.sandwichesMissed = 0; // 💔 السندوتشات المفقودة
        
        // أصوات اللعبة
        this.sounds = {};
        this.soundEnabled = true;
    }
    
    initializeFreeSandwichSystem() {
        // نظام الساندوتش المجاني - مرتان يومياً فقط
        const today = new Date().toDateString();
        const savedData = localStorage.getItem('burgstaFreeSandwichData');
        
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.date === today) {
                // نفس اليوم - استخدم البيانات المحفوظة
                this.freeSandwichesUsed = data.used || 0;
            } else {
                // يوم جديد - إعادة تعيين
                this.freeSandwichesUsed = 0;
                this.saveFreeSandwichData(today);
            }
        } else {
            // أول مرة
            this.freeSandwichesUsed = 0;
            this.saveFreeSandwichData(today);
        }
        
        this.maxFreeSandwichesPerDay = 2; // مرتان فقط يومياً
        
        // تهيئة نظام السندوتش الذهبي
        // تم حذف نظام الساندوتش الذهبي القديم
    }
    
    // تم حذف نظام الساندوتش الذهبي القديم - نستخدم النظام الموحد فقط
    
    // تم حذف canCatchGoldenSandwich و useGoldenSandwich - النظام القديم محذوف نهائياً
    
    saveFreeSandwichData(date) {
        const data = {
            date: date,
            used: this.freeSandwichesUsed
        };
        localStorage.setItem('burgstaFreeSandwichData', JSON.stringify(data));
    }
    
    canGetFreeSandwich() {
        return this.freeSandwichesUsed < this.maxFreeSandwichesPerDay;
    }
    
    useFreeSandwich() {
        if (this.canGetFreeSandwich()) {
            this.freeSandwichesUsed++;
            this.saveFreeSandwichData(new Date().toDateString());
            return true;
        }
        return false;
    }
    
    getDailyData() {
        // إرجاع بيانات اليوم الحالي
        const today = new Date().toDateString();
        const savedData = localStorage.getItem('burgstaFreeSandwichData');
        
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.date === today) {
                return {
                    freeSandwiches: data.used || 0,
                    date: today
                };
            }
        }
        
        // يوم جديد - إرجاع بيانات نظيفة
        return {
            freeSandwiches: 0,
            date: today
        };
    }
    
    incrementFreeSandwichCount() {
        // زيادة عداد الوجبات المجانية اليوم
        this.freeSandwichesUsed++;
        this.saveFreeSandwichData(new Date().toDateString());
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
        // تم حذف البوكس المزعج - الآن الوجبة المجانية تعمل بسلاسة
        console.log('🎉 تم ربح الوجبة المجانية!', message);
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
        // سرعة جنونية للمحترفين من البداية! �💥
        let speedMultiplier = 1.0;
        
        if (this.discount >= 25) {
            speedMultiplier = 12.0; // صاروخ فضائي! 🚀💀 // صاروخ فضائي! ��💀
        } else if (this.discount >= 15) {
            speedMultiplier = 7.0; // سرعة عالية بعد 15%! 🔥🔥 // برق خاطف! ⚡🔥🔥
        } else if (this.discount >= 10) {
            speedMultiplier = 5.0; // هنا يبدأ الجنون بعد 10%! 💫🔥 // سرعة الضوء! 💫🔥
        } else if (this.discount >= 5) {
            speedMultiplier = 2.5; // سرعة معتدلة بعد 5% 🏃‍♂️ // نار محرقة! 🔥🔥
        } else {
            speedMultiplier = 1.8; // بداية ممتعة مع تحدي خفيف 🏃‍♂️
        }
        
        return GAME_CONFIG.items.baseSpeed * speedMultiplier;
    }
    
    getCurrentSpawnRate() {
        // معدل الظهور يزيد بشكل تدريجي (الوقت يقل) حسب نسبة الخصم
        // منحنى ظهور تدريجي منطقي 🎯
        let spawnMultiplier = 1.0;
        
        if (this.discount >= 25) {
            spawnMultiplier = 0.05; // إعصار ساندوتشات! 🌪️💀
        } else if (this.discount >= 15) {
            spawnMultiplier = 0.08; // مطر غزير! ☔🔥🔥
        } else if (this.discount >= 10) {
            spawnMultiplier = 0.25; // هنا يبدأ التحدي بعد 10%! 💧🔥 // شلال ساندوتشات! 💧🔥  // سريع �
        } else if (this.discount >= 5) {
            spawnMultiplier = 0.5; // سرعة معتدلة بعد 5% 🏃‍♂️
        } else {
            spawnMultiplier = 0.6; // بداية ممتعة مع نشاط أكثر 🏃‍♂️ // بداية مريحة وسهلة �
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
        // تحميل صورة الصندوق للاعب
        this.load.image('box', 'images/box.png');
        
        // تحميل صور الساندوتشات الحقيقية
        this.load.image('goodSandwich', 'images/اورجينال.png');
        this.load.image('badItem', 'images/boom.png');
        this.load.image('goldenSandwich', 'images/Gold.png'); // الساندوتش الذهبي المخصوص
        
        // إنشاء باقي الأشكال (الساندوتش الذهبي فقط)
        this.createGameAssets();
    }
    
    createGameAssets() {
        // الآن نستخدم صورة Gold.png المخصوصة - لا حاجة لرسم الساندوتش الذهبي
        // جميع الساندوتشات تستخدم صور حقيقية من مجلد images
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
        const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي الفاصل
        this.physics.world.setBounds(0, 0, gameAreaWidth, GAME_CONFIG.height + 100); // امتداد أسفل الشاشة
        
        this.physics.world.on('worldbounds', (body) => {
            // نتعامل فقط مع العناصر التي ليست من fallingItems
            // العناصر المتساقطة لها معالج خاص في createFallingItem
            if (body.gameObject && (body.gameObject.y > GAME_CONFIG.height + 50 || body.gameObject.x > gameAreaWidth)) {
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
        const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي
        
        // إنشاء اللاعب في موضع مناسب للدقة HD
        this.player = this.physics.add.sprite(
            gameAreaWidth / 2, 
            GAME_CONFIG.height - 100, // موضع مناسب للدقة HD
            'box'
        );
        
        // تعديل الصندوق ليتناسب مع دقة HD - حجم أصغر للتحدي
        this.player.setScale(0.35); // حجم أصغر لتحدي أكبر! 📦
        
        // تحسينات فيزياء للاستجابة الصاروخية
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(80, 40); // منطقة تصادم أصغر للمهارة
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
        dividerLine.lineStyle(3, 0xc49b41, 0.8); // خط مناسب للدقة HD
        dividerLine.beginPath();
        dividerLine.moveTo(GAME_CONFIG.width - 180, 0);
        dividerLine.lineTo(GAME_CONFIG.width - 180, GAME_CONFIG.height);
        dividerLine.strokePath();
        
        // === لوحة المعلومات اليمنى ===
        this.createRightInfoPanel();
    }
    
    createRightInfoPanel() {
        const panelX = GAME_CONFIG.width - 170; // لوحة مناسبة للدقة HD
        let currentY = 20; // مسافات مناسبة
        
        // خلفية اللوحة
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000000, 0.1);
        panelBg.fillRoundedRect(panelX - 10, 10, 170, GAME_CONFIG.height - 20, 15); // لوحة مناسبة للدقة HD
        
        // === 1. النقاط ===
        this.ui.scoreText = this.add.text(panelX, currentY, 'النقاط: 0', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px', // خط مناسب للدقة HD
            fontWeight: '600',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 30;
        
        // === 2. المستوى ===
        this.ui.levelText = this.add.text(panelX, currentY, 'المستوى: 1', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px', // خط مناسب
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 30;
        
        // === 3. أكياس البطاطس (الأرواح) ===
        this.ui.livesLabel = this.add.text(panelX, currentY, 'أكياس البطاطس:', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px', // خط مناسب للعنوان
            color: GAME_CONFIG.colors.primary
        });
        currentY += 25;
        
        this.ui.livesText = this.add.text(panelX, currentY, '🍟🍟🍟', {
            fontFamily: 'Cairo, Arial',
            fontSize: '22px', // خط مناسب لأيقونات الأرواح
            color: GAME_CONFIG.colors.primary
        });
        currentY += 40;
        
        // === 4. التقدم في البناء ===
        this.ui.progressTitle = this.add.text(panelX, currentY, '🍔 تقدم البرجر', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px', // خط مناسب لعنوان التقدم
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.accent
        });
        currentY += 30;
        
        // === 5. النسبة المئوية الكبيرة ===
        this.ui.discountPercentText = this.add.text(panelX, currentY, '0%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '32px', // خط مناسب للنسبة المئوية
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        });
        currentY += 40;
        
        // === 6. الجزء الحالي من السندوتش ===
        this.ui.currentPartText = this.add.text(panelX, currentY, 'الطبق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '14px', // خط مناسب للجزء الحالي
            fontWeight: '600',
            color: GAME_CONFIG.colors.dark
        });
        currentY += 40;
        

        
        // === 8. مؤشر مستوى المخاطرة 🎯 ===
        this.ui.riskLevelTitle = this.add.text(panelX, currentY, '🎯 مستوى التحدي', {
            fontFamily: 'Cairo, Arial',
            fontSize: '13px', // خط مناسب لمستوى التحدي
            fontWeight: 'bold',
            color: '#e74c3c'
        });
        currentY += 20; // مسافة مناسبة بين العنوان والنص
        
        this.ui.riskLevelText = this.add.text(panelX, currentY, 'مبتدئ 🟢', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px', // خط مناسب لنص مستوى المخاطرة
            fontWeight: '600',
            color: '#27ae60'
        });
        currentY += 25; // مسافة مناسبة قبل "القادم"
        
        this.ui.nextMilestoneText = this.add.text(panelX, currentY, 'القادم: 10%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '10px', // خط مناسب للمعلم القادم
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
        // موقع بناء السندوتش (في الجزء الأيمن خارج منطقة اللعب)
        const gameAreaWidth = GAME_CONFIG.width - 180; // حد منطقة اللعب
        const sandwichX = gameAreaWidth + 90; // وسط المنطقة اليمنى (180/2 = 90)
        const sandwichY = 50; // موقع أعلى مناسب
        
        // خلفية شفافة للسندوتش - حجم مناسب
        this.ui.sandwichBg = this.add.graphics();
        this.ui.sandwichBg.fillStyle(0x000000, 0.1);
        this.ui.sandwichBg.fillRoundedRect(sandwichX - 10, sandwichY - 10, 80, 200, 10); // حجم مناسب للدقة HD
        
        // إطار ذهبي حول منطقة السندوتش
        this.ui.sandwichBg.lineStyle(2, 0xc49b41);
        this.ui.sandwichBg.strokeRoundedRect(sandwichX - 10, sandwichY - 10, 80, 200, 10);
        
        // عنوان السندوتش - حجم وموضع مناسب
        this.ui.sandwichTitle = this.add.text(sandwichX + 30, sandwichY - 30, 'برجر برجستا', {
            fontFamily: 'Cairo, Arial',
            fontSize: '14px', // خط مناسب لعنوان السندوتش للدقة HD
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        }).setOrigin(0.5, 0);
        
        // مستويات الجوائز مع أيقونات - مواضع مناسبة للدقة HD
        this.ui.reward30Icon = this.add.text(sandwichX - 10, sandwichY + 50, '🍟 30%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px', // خط مناسب للجوائز للدقة HD
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        this.ui.reward60Icon = this.add.text(sandwichX - 10, sandwichY + 30, '🍔 60%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px', // خط مناسب للجوائز للدقة HD
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        this.ui.reward100Icon = this.add.text(sandwichX - 10, sandwichY + 10, '🎉 100%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '12px', // خط مناسب للجوائز للدقة HD
            color: GAME_CONFIG.colors.dark
        }).setOrigin(1, 0.5);
        
        // خطوط مستويات الجوائز - أثخن وأكبر
        this.ui.sandwichBg.lineStyle(2, 0x8b6914, 0.5);
        this.ui.sandwichBg.beginPath();
        this.ui.sandwichBg.moveTo(sandwichX - 10, sandwichY + 150);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 150);
        this.ui.sandwichBg.moveTo(sandwichX - 10, sandwichY + 90);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 90);
        this.ui.sandwichBg.moveTo(sandwichX - 10, sandwichY + 30);
        this.ui.sandwichBg.lineTo(sandwichX + 65, sandwichY + 30);
        this.ui.sandwichBg.strokePath();
        
        // مكونات السندوتش (ستظهر تدريجياً)
        this.ui.sandwichLayers = this.add.graphics();
        
        // نص النسبة المئوية - حجم وموضع مناسب
        this.ui.discountPercentText = this.add.text(sandwichX + 30, sandwichY + 190, '0%', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px', // خط مناسب للنسبة المئوية للدقة HD
            fontWeight: 'bold',
            color: GAME_CONFIG.colors.primary
        }).setOrigin(0.5, 0);
    }
    
    updateDiscountMeter() {
        const discount = this.gameManager.discount;
        
        // تحديث النسبة المئوية بصيغة مبسطة (0.1, 0.2, 1.0, إلخ)
        const displayDiscount = discount.toFixed(1);
        this.ui.discountPercentText.setText(`${displayDiscount}%`);
        
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
        
        // موقع السندوتش في وسط الجزء الأيمن من أسفل الصفحة - حجم أكبر للشاشة 4K
        const rightPanelWidth = 400; // عرض الجزء الأيمن الجديد
        const x = GAME_CONFIG.width - (rightPanelWidth / 2) - 60; // وسط الجزء الأيمن مع هامش أكبر
        const y = GAME_CONFIG.height - 100; // أعلى قليلاً ليتسع الحجم الأكبر
        
        // مسح السندوتش السابق
        this.ui.miniSandwichLayers.clear();
        
        let currentY = y; // البداية من الأسفل
        
        // رسم برجر واقعي متدرج - حجم مناسب للدقة HD
        const burgerWidth = 60;  // عرض مناسب للدقة HD
        const burgerCenterX = x + 20;  // مركز البرجر داخل اللوحة
        
        // 1. الطبق - قاعدة عريضة مناسبة
        this.ui.miniSandwichLayers.fillStyle(0xf5f5f5);
        this.ui.miniSandwichLayers.fillEllipse(burgerCenterX, currentY + 4, 70, 8); // حجم مناسب للدقة HD
        this.ui.miniSandwichLayers.lineStyle(1, 0xd0d0d0);
        this.ui.miniSandwichLayers.strokeEllipse(burgerCenterX, currentY + 4, 70, 8);
        // ظل الطبق
        this.ui.miniSandwichLayers.fillStyle(0xe8e8e8);
        this.ui.miniSandwichLayers.fillEllipse(burgerCenterX, currentY + 6, 60, 4);
        
        // 2. الخبز السفلي (5%) - قاعدة البرجر
        if (discount >= 5) {
            currentY -= 6;
            // الخبز السفلي مقبب قليلاً
            this.ui.miniSandwichLayers.fillStyle(0xdaa520);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2, currentY, burgerWidth, 5, 2);
            // لون أغمق للعمق
            this.ui.miniSandwichLayers.fillStyle(0xb8860b);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2 + 1, currentY + 1, burgerWidth - 2, 3, 1);
            // ملمس الخبز
            this.ui.miniSandwichLayers.fillStyle(0xcd9b1d);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - burgerWidth/2 + 2, currentY + 2, burgerWidth - 4, 1, 1);
        }
        
        // 3. الجبن الأول (15%) - جبن منصهر ينسكب على الجوانب
        if (discount >= 15) {
            currentY -= 2;
            const cheeseWidth = burgerWidth - 4;
            // جبن أساسي
            this.ui.miniSandwichLayers.fillStyle(0xffd700);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheeseWidth/2, currentY, cheeseWidth, 1);
            // جبن منصهر يتدلى على الجوانب
            this.ui.miniSandwichLayers.fillStyle(0xffeb3b);
            this.ui.miniSandwichLayers.fillRoundedRect(burgerCenterX - cheeseWidth/2 - 2, currentY + 1, cheeseWidth + 4, 1, 1);
            // لمعة الجبن
            this.ui.miniSandwichLayers.fillStyle(0xffffe0, 0.7);
            this.ui.miniSandwichLayers.fillRect(burgerCenterX - cheeseWidth/2 + 1, currentY, cheeseWidth - 2, 1);
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
                fontSize: '20px' // حجم مناسب للإيموجي للدقة HD
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
            fontSize: '24px', // حجم مناسب للدقة HD
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#8B4513',
            strokeThickness: 9 // خط أثخن للدقة 4K
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
        const gameAreaWidth = GAME_CONFIG.width - 180; // منطقة اللعب حتى الخط الذهبي
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
        // نطاق التقاط دقيق للمحترفين فقط - لا سهولة! 🔥
        const distance = Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y);
        const maxDistance = 45; // نطاق أصغر جداً - دقة عالية مطلوبة! 🎯
        
        if (distance > maxDistance) {
            return; // خارج النطاق - لا مساعدة!
        }
        
        // وضع علامة على أن العنصر تم جمعه
        item.isCollected = true;
        
        // إلغاء فحص السقوط إذا كان موجوداً
        if (item.dropChecker) {
            item.dropChecker.destroy();
        }
        
        // إزالة العنصر
        // تنظيف شامل للتأثيرات الخاصة قبل التدمير
        if (item.updateGlow) {
            item.updateGlow.destroy();
        }
        if (item.colorTimer) {
            item.colorTimer.destroy();
        }
        if (item.glowEffect) {
            item.glowEffect.destroy();
        }
        if (item.allEffects) {
            item.allEffects.forEach(effect => {
                if (effect && effect.destroy) effect.destroy();
            });
        }
        
        item.destroy();
        
        // فحص إذا كان الساندوتش الذهبي الموحد الجديد
        if (item.isUnifiedGoldenSandwich) {
            // حفظ بيانات الجائزة قبل حذف العنصر
            const prizeData = {
                prizeType: item.prizeType,
                prizeMessage: item.prizeMessage,
                prizeColor: item.prizeColor
            };
            this.handleUnifiedGoldenSandwich(prizeData);
            return;
        }
        
        // تم حذف الأنظمة القديمة - نستخدم triggerUnifiedGoldenSandwich فقط
        
        // معالجة حسب نوع العنصر
        switch (item.itemType) {
            case 'good':
                this.handleGoodSandwich();
                break;
            // تم حذف case 'golden' - نستخدم النظام الموحد فقط
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
        
        // تأثير بصري بصيغة مبسطة
        this.showFloatingText(`+${GAME_CONFIG.discount.goodSandwich.toFixed(1)}%`, GAME_CONFIG.colors.success);
        
        // صوت
        try {
            if (this.sounds && this.sounds.collect) {
                this.sounds.collect.play();
            }
        } catch (error) {
            // تجاهل أخطاء الأصوات
        }
    }

    handleUnifiedGoldenSandwich(prizeData) {
        // 🎁 نظام الجوائز المحدد مسبقاً
        console.log('🏆 Handling golden sandwich:', prizeData);
        const prizeType = prizeData.prizeType;
        
        if (prizeType === 'freeMeal') {
            // 🎉 وجبة مجانية كاملة
            this.gameManager.incrementFreeSandwichCount();
            
            // احتفال خاص للوجبة المجانية
            this.gameManager.discount = 100;
            this.gameManager.gameWon = true;
            this.spawnTimer.paused = true;
            this.physics.pause();
            
            // رسالة احتفال مميزة
            this.showGoldenFreeSandwichCelebration();
            
            // صوت مميز
            if (this.sounds && this.sounds.golden) {
                this.sounds.golden.play();
            }
            
            // الوجبة المجانية جاهزة - بدون بوكس مزعج!
            
        } else if (prizeType === 'discount3') {
            // خصم 3%
            console.log('✅ Adding 3% discount');
            this.gameManager.addDiscount(3);
            this.gameManager.score += 100;
            
            this.createSpecialEffect(this.player.x, this.player.y);
            this.showMessage('🌟 خصم 3% ذهبي ممتاز!', 2500, '#FFD700');
            
        } else if (prizeType === 'discount1_5') {
            // خصم 1.5%
            console.log('✅ Adding 1.5% discount');
            this.gameManager.addDiscount(1.5);
            this.gameManager.score += 50;
            
            this.createSpecialEffect(this.player.x, this.player.y);
            this.showMessage('⭐ خصم 1.5% ذهبي رائع!', 2500, '#FFD700');
        } else {
            console.error('❌ Unknown prize type:', prizeType);
        }
        
        // صوت مميز
        if (this.sounds && this.sounds.golden) {
            this.sounds.golden.play();
        }
    }
    
    // تم حذف handleFreeSandwich القديم - الآن مدمج في handleUnifiedGoldenSandwich

    showGoldenFreeSandwichCelebration() {
        // خلفية احتفالية لامعة
        const celebrationBg = this.add.graphics();
        celebrationBg.fillGradientStyle(
            0x000000, 0x000000, 0xFFD700, 0xFFD700, 0.85
        );
        celebrationBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        celebrationBg.setDepth(200);

        // العنوان الرئيسي
        const mainTitle = this.add.text(GAME_CONFIG.width / 2, 330, 
            '🏆 مبروك أيها الأسطورة!\nلقد حصلت على الساندوتش الذهبي المجاني 🍔✨\nاستمتع بوجبتك الكاملة — لقد حققت إنجازًا نادرًا جدًا! 🔥', {
            fontSize: '18px',
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            stroke: '#FFFFFF',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        mainTitle.setDepth(201);

        // رسالة للكاشير
        const explanation = this.add.text(GAME_CONFIG.width / 2, 460, 
            'اظهر هذا للكاشير', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);
        explanation.setDepth(201);

        // تفاصيل بسيطة ومفيدة
        const whatHappened = this.add.text(GAME_CONFIG.width / 2, 520, 
            'صالحة لاستخدام واحد فقط', {
            fontSize: '14px',
            fill: '#FFFACD',
            fontFamily: 'Arial',
            stroke: '#8B7D6B',
            strokeThickness: 2,
            align: 'center',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);
        whatHappened.setDepth(201);

        // زر "العب مرة أخرى"
        const playAgainButton = this.add.text(GAME_CONFIG.width / 2, 540, 
            '🔄 العب مرة أخرى', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial Black',
            stroke: '#8B4513',
            strokeThickness: 1,
            align: 'center',
            backgroundColor: '#8B4513',
            padding: { x: 16, y: 8 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);
        playAgainButton.setDepth(202);
        playAgainButton.setInteractive({ cursor: 'pointer' });
        
        // عند النقر على زر "العب تاني"
        playAgainButton.on('pointerdown', () => {
            // إعادة تشغيل اللعبة
            this.scene.restart();
        });

        // تأثير hover للزر
        playAgainButton.on('pointerover', () => {
            playAgainButton.setScale(1.1);
        });
        playAgainButton.on('pointerout', () => {
            playAgainButton.setScale(1);
        });

        // احتفال بسيط بدون تأثيرات مزعجة

        // تأثير وميض ذهبي للخلفية
        this.tweens.add({
            targets: celebrationBg,
            alpha: 0.7,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });

        // جزيئات ذهبية متطايرة
        for (let i = 0; i < 20; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(0xFFD700, 0.8);
            particle.fillCircle(0, 0, Math.random() * 8 + 4);
            particle.x = Math.random() * GAME_CONFIG.width;
            particle.y = Math.random() * GAME_CONFIG.height;
            particle.setDepth(202);

            this.tweens.add({
                targets: particle,
                y: particle.y - 200,
                alpha: 0,
                duration: 3000 + Math.random() * 1000,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    showUnifiedGoldenCelebration() {
        // خلفية احتفالية متدرجة ذهبية
        const celebrationBg = this.add.graphics();
        celebrationBg.fillGradientStyle(
            0x000000, 0x000000, 0xFFD700, 0xFFD700, 0.9
        );
        celebrationBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        celebrationBg.setDepth(200);

        // العنوان الرئيسي
        const mainTitle = this.add.text(GAME_CONFIG.width / 2, 300, 
            '🏆 مبروك أيها الأسطورة!\nلقد حصلت على الساندوتش الذهبي المجاني 🍔✨\nاستمتع بوجبتك الكاملة — لقد حققت إنجازًا نادرًا جدًا! 🔥', {
            fontSize: '18px',
            fill: '#FFD700',
            fontFamily: 'Arial Black',
            stroke: '#FFFFFF',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        mainTitle.setDepth(201);

        // رسالة للكاشير
        const explanation = this.add.text(GAME_CONFIG.width / 2, 430, 
            'اظهر هذا للكاشير', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);
        explanation.setDepth(201);

        // تفاصيل بسيطة ومفيدة
        const whatHappened = this.add.text(GAME_CONFIG.width / 2, 480, 
            'صالحة لاستخدام واحد فقط', {
            fontSize: '14px',
            fill: '#FFFACD',
            fontFamily: 'Arial',
            stroke: '#8B7D6B',
            strokeThickness: 2,
            align: 'center',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);
        whatHappened.setDepth(201);

        // زر "العب مرة أخرى"
        const playAgainButton2 = this.add.text(GAME_CONFIG.width / 2, 510, 
            '🔄 العب مرة أخرى', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial Black',
            stroke: '#8B4513',
            strokeThickness: 1,
            align: 'center',
            backgroundColor: '#8B4513',
            padding: { x: 16, y: 8 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);
        playAgainButton2.setDepth(202);
        playAgainButton2.setInteractive({ cursor: 'pointer' });
        
        // عند النقر على زر "العب تاني"
        playAgainButton2.on('pointerdown', () => {
            this.scene.restart();
        });

        // تأثير hover للزر
        playAgainButton2.on('pointerover', () => {
            playAgainButton2.setScale(1.1);
        });
        playAgainButton2.on('pointerout', () => {
            playAgainButton2.setScale(1);
        });

        // احتفال بسيط بدون تأثيرات مزعجة

        // جزيئات ذهبية
        for (let i = 0; i < 25; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(0xFFD700, 0.9);
            particle.fillCircle(0, 0, Math.random() * 10 + 5);
            particle.x = Math.random() * GAME_CONFIG.width;
            particle.y = Math.random() * GAME_CONFIG.height;
            particle.setDepth(202);

            this.tweens.add({
                targets: particle,
                y: particle.y - 300,
                alpha: 0,
                duration: 3500 + Math.random() * 1500,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }
    
    // تم حذف handleSpecialGoldenSandwich - النظام القديم محذوف نهائياً
    
    // تم حذف handleGoldenSandwich() - نستخدم handleUnifiedGoldenSandwich فقط
    
    handleBadItem() {
        // 💥 القنبلة تخصم من الخصم المُجمّع
        const lostDiscount = Math.abs(GAME_CONFIG.discount.badItem);
        
        // 🍟 فحص إذا كان الخصم سيصل لـ0% أو أقل بعد الخصم
        const discountAfterLoss = this.gameManager.discount - lostDiscount;
        
        // خصم النسبة أولاً
        this.gameManager.addDiscount(-lostDiscount);
        
        // إذا وصل الخصم لـ0% أو أقل → خسارة حياة إضافية!
        if (discountAfterLoss <= 0) {
            this.gameManager.loseLife();
            this.showFloatingText(`-${lostDiscount.toFixed(1)}% و حياة!`, GAME_CONFIG.colors.danger);
        } else {
            this.showFloatingText(`-${lostDiscount.toFixed(1)}%`, GAME_CONFIG.colors.danger);
        }
        
        this.gameManager.badCaught++;
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
        const floatingText = this.add.text(this.player.x, this.player.y - 40, text, {
            fontFamily: 'Cairo, Arial',
            fontSize: `${22 * scale}px`,
            fontWeight: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        floatingText.setDepth(998); // فوق اللعبة تحت الرسائل
        
        this.tweens.add({
            targets: floatingText,
            y: floatingText.y - 100,
            alpha: 0,
            scale: scale * 1.2,
            duration: 1200,
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
        
        // 🕰️ فترات زمنية متغيرة لجعل اللعبة أكثر تشويق وعدم قابلية للتنبؤ
        const randomDelay = Math.random() * 400; // تأخير عشوائي من 0 إلى 400ms
        this.time.delayedCall(randomDelay, () => {
            this.actualSpawnItems();
        });
    }
    
    actualSpawnItems() {
        if (this.gameManager.gameOver || this.gameManager.gameWon) return;
        
        // تحديد منطقة اللعب (الجانب الأيسر فقط - قبل الخط الفاصل)
        const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي الفاصل
        
        // تحديد نوع العنصر (بدون سندوتشات ذهبية عادية)
        const currentDifficulty = this.getCurrentDifficultyLevel();
        
        // احتماليات صعبة جداً - خصم حقيقي يستحق التحدي! 💰
        let badChance;
        
        // صعوبة تدريجية - سهلة في البداية، جحيم بعد 10%! ��
        if (this.gameManager.discount < 5) {
            badChance = 0.35; // 35% قنابل - بداية ممتعة مع تحدي 🏃‍♂️
        } else if (this.gameManager.discount < 10) {
            badChance = 0.55; // 55% قنابل - تحدي ملحوظ 🔥
        } else if (this.gameManager.discount < 15) {
            badChance = 0.75; // 75% قنابل - هنا يبدأ الجحيم! 🔥💣
        } else if (this.gameManager.discount < 20) {
            badChance = 0.85; // 85% قنابل - منطقة حرب! 💥🔥
        } else if (this.gameManager.discount < 25) {
            badChance = 0.92; // 92% قنابل - أرض المعركة! 💀🔥🔥
        } else {
            badChance = 0.97; // 97% قنابل - جهنم على الأرض! 👹💀
        }
        
        // تدرج في عدد الأشياء حسب النسبة - سهل في البداية! 📈
        let itemCount = 1; // شيء واحد بالأساس
        if (this.gameManager.discount >= 15) {
            // بعد 15% - مطر من الساندوتشات! 
            itemCount = Math.random() < 0.4 ? 3 : (Math.random() < 0.7 ? 2 : 1); 
        } else if (this.gameManager.discount >= 10) {
            // بعد 10% - شيئين أحياناً
            itemCount = Math.random() < 0.3 ? 2 : 1;
        } // قبل 10% = شيء واحد فقط
        
        for (let i = 0; i < itemCount; i++) {
            const x = Math.random() * (gameAreaWidth - 50) + 25;
            let itemType, texture;
            const rand = Math.random();
            
            if (rand < badChance) {
                itemType = 'bad';
                texture = 'badItem';
            } else {
                itemType = 'good';
                texture = 'goodSandwich';
            }
            
            // إنشاء فوري مع تأخير صغير بين كل شيء
            this.time.delayedCall(i * 50, () => {
                this.createFallingItem(x, itemType, texture);
            });
        }
    }
    
    checkSpecialGoldenSandwich() {
        // تم إزالة النظام القديم - نستخدم triggerUnifiedGoldenSandwich فقط
        return;
    }
    
    showGoldenSandwichWarning() {
        // تم إزالة التنبيه - المعلومة موجودة في رسالة الاختيار
        
        // صوت تحذيري فقط
        if (this.sounds && this.sounds.golden) {
            this.sounds.golden.play();
        }
    }
    
    // تم حذف النظام القديم launchSpecialGoldenSandwich - نستخدم triggerUnifiedGoldenSandwich فقط

    // تم حذف النظام القديم spawnGoldenSandwich - نستخدم triggerUnifiedGoldenSandwich فقط
    
    createFallingItem(x, itemType, texture) {
        // إنشاء العنصر المتساقط
        const item = this.physics.add.sprite(x, -30, texture);
        item.itemType = itemType;
        
        // تصغير الصور لتناسب اللعبة
        if (itemType === 'good') {
            item.setScale(0.15); // حجم الساندوتش العادي كما كان! 🥪
            item.setDepth(20); // السندويتشات الجيدة في المقدمة
        } else {
            item.setScale(0.05); // حجم أصغر للقنبلة - خطر خفي! 💣
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
                    if (itemType === 'good') {
                        this.checkAndAdjustGoodItemPosition(item);
                    }
                    
                    // إذا وصل العنصر إلى منطقة أسفل البوكس (تحت الموضع الجديد)
                    if (item.y >= GAME_CONFIG.height - 50) { // السندوتش يُفقد عندما يمر البوكس بـ50 بكسل
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
            const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي
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
            fontSize: '18px', // حجم مناسب للدقة HD
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
    
    showMessage(message, duration = 2000, color = '#ffffff') {
        // إزالة الرسائل القديمة إن وجدت
        if (this.currentMessage) {
            this.currentMessage.messageBg.destroy();
            this.currentMessage.messageText.destroy();
        }
        
        // إنشاء خلفية للرسالة
        const messageBg = this.add.graphics();
        messageBg.fillStyle(0x000000, 0.85);
        messageBg.fillRoundedRect(GAME_CONFIG.width / 2 - 200, 100, 400, 80, 20);
        
        // إطار ملون حسب نوع الرسالة
        messageBg.lineStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 1);
        messageBg.strokeRoundedRect(GAME_CONFIG.width / 2 - 200, 100, 400, 80, 20);
        messageBg.setDepth(999); // فوق كل شيء
        
        // النص
        const messageText = this.add.text(GAME_CONFIG.width / 2, 140, message, {
            fontFamily: 'Cairo, Arial',
            fontSize: '26px',
            fontWeight: 'bold',
            color: color,
            align: 'center',
            wordWrap: { width: 360 }
        }).setOrigin(0.5);
        messageText.setDepth(1000); // فوق الخلفية
        
        // حفظ المرجع
        this.currentMessage = { messageBg, messageText };
        
        // تأثير ظهور واختفاء
        messageBg.setAlpha(0);
        messageText.setAlpha(0);
        
        this.tweens.add({
            targets: [messageBg, messageText],
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: [messageBg, messageText],
            alpha: 0,
            duration: 500,
            delay: duration,
            ease: 'Power2',
            onComplete: () => {
                messageBg.destroy();
                messageText.destroy();
                this.currentMessage = null;
            }
        });
    }
    
    showDifficultyNotification(title, message) {
        // إنشاء container للإشعار منظم
        const notificationPopup = this.add.container(GAME_CONFIG.width / 2, 120);
        
        // خلفية الإشعار مع حدود
        const notificationBg = this.add.graphics();
        notificationBg.fillStyle(0xffa500, 0.95);
        notificationBg.lineStyle(2, 0xff6600, 1);
        notificationBg.fillRoundedRect(-110, -30, 220, 60, 10);
        notificationBg.strokeRoundedRect(-110, -30, 220, 60, 10);
        
        const titleText = this.add.text(0, -12, title, {
            fontFamily: 'Arial Black',
            fontSize: '22px', // خط مناسب لعنوان الإشعار للدقة HD
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3, // خط مناسب للدقة HD
            align: 'center'
        }).setOrigin(0.5);
        
        const messageText = this.add.text(0, 8, message, {
            fontFamily: 'Arial',
            fontSize: '16px', // خط مناسب لرسالة الإشعار للدقة HD
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2, // خط مناسب للدقة HD
            align: 'center',
            wordWrap: { width: 200 } // عرض مناسب للدقة HD
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
            fontSize: '24px',
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
    showGameOver() {
        // إيقاف اللعبة
        this.spawnTimer.paused = true;
        this.physics.pause();
        
        // خلفية الخسارة شفافة
        const gameOverBg = this.add.graphics();
        gameOverBg.fillStyle(0x000000, 0.7); // خلفية أغمق لوضوح أكبر
        gameOverBg.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        gameOverBg.setDepth(99); // طبقة عالية تحت النصوص مباشرة
        
        // إزالة صندوق الخسارة الملون - النصوص فقط فوق اللعبة مباشرة
        
        // نصوص الخسارة
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 100, 'انتهت اللعبة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '32px', // حجم مناسب للدقة HD
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3 // سمك مناسب للدقة HD
        }).setOrigin(0.5).setDepth(100); // طبقة عالية فوق كل العناصر
        
        let finalMessage = 'لم تحصل على أي خصم - لأنك لم تنسحب في الوقت المناسب!';
        // عند الخسارة، لا يحصل اللاعب على أي خصم لأنه لم ينسحب
        // الخصم يُحصل عليه فقط عند الانسحاب الآمن أو الفوز الكامل
        
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 50, finalMessage, {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px', // حجم مناسب للدقة HD
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2, // سمك مناسب للدقة HD
            align: 'center',
            wordWrap: { width: GAME_CONFIG.width - 100 } // عرض مناسب للدقة HD
        }).setOrigin(0.5).setDepth(100); // طبقة عالية فوق كل العناصر
        
        // إحصائيات نهائية
        const finalStats = [
            `الخصم النهائي: ${this.gameManager.discount}%`,
            `النقاط: ${this.gameManager.score}`,
            `المستوى: ${this.gameManager.level}`,
            `السندوتشات المفقودة: ${this.gameManager.sandwichesMissed}`
        ];
        
        this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 50, finalStats.join('\n'), {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px', // حجم مناسب للدقة HD
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4, // تكبير السمك أيضاً
            align: 'center',
            lineSpacing: 30 // مسافات أكبر بين الأسطر
        }).setOrigin(0.5).setDepth(100); // طبقة عالية فوق كل العناصر
        
        // زر إعادة اللعب
        const restartBtn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 300, 'حاول مرة أخرى', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px', // حجم مناسب للدقة HD
            fontWeight: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6, // تكبير السمك أيضاً
            backgroundColor: GAME_CONFIG.colors.primary,
            padding: { x: 40, y: 20 } // تكبير الحشو أيضاً
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(100); // طبقة عالية فوق كل العناصر
        
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
            const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي
            const speed = GAME_CONFIG.player.speed;
            
            // حركة يسار ويمين بالمفاتيح
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                this.player.x = Math.max(25, this.player.x - speed);
            }
            if (this.cursors.right.isDown || this.wasd.D.isDown) {
                this.player.x = Math.min(gameAreaWidth - 25, this.player.x + speed);
            }
        }
        

        
        // لا توجد مساعدة - مهارة خالصة مطلوبة! 🔥
        
        // تنظيف العناصر التي تخرج من منطقة اللعب أو الشاشة
        const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي
        
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

        // الجملة الأولى: مبروك وصلت للمستوى الأول - في أعلى الصفحة
        const titleText = this.add.text(centerX, 150, level.description, {
            fontSize: '20px', // حجم مناسب للدقة HD
            fill: '#ffff00',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 6, fill: true }
        }).setOrigin(0.5);
        titleText.setDepth(55);

        // الجملة الثانية: خصم 10% - تحت الأولى مباشرة
        const rewardText = this.add.text(centerX, 250, level.reward, {
            fontSize: '14px', // حجم مناسب للدقة HD
            fill: '#00ff00',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
        }).setOrigin(0.5);
        rewardText.setDepth(55);

        // إنشاء النص - رسالة كاملة في المرة الأولى فقط (5%)، رسالة مختصرة بعد ذلك
        let infoMessage = '';
        
        if (level.percent === 5) {
            // الرسالة الكاملة للمرة الأولى فقط
            infoMessage = `لديك خياران:\n\n`;
            
            // الخيار الأول: الانسحاب
            infoMessage += `الخيار الأول - الانسحاب الآمن:\n`;
            infoMessage += `انهاء اللعب والفوز بما حققت\n\n`;
            
            // الخيار الثاني: المتابعة
            infoMessage += `الخيار الثاني - المتابعة للمغامرة:\n`;
            const nextLevel = 10;
            infoMessage += `هدف: الوصول للمستوى التالي (${nextLevel}%)\n`;
            
            // إضافة معلومة السندويتش الذهبي إذا كان متاحاً
            if (level.reward.includes('سندويتش ذهبي')) {
                infoMessage += `مكافأة فورية: سندويتش ذهبي (+3% خصم)\n`;
                infoMessage += `سرعة عالية - تحدي ممتع!\n`;
            }
            
            // إضافة تحذير المخاطر
            infoMessage += `\nتحذير هام:\n`;
            infoMessage += `${level.nextRisk}\n`;
            infoMessage += `إذا فشلت في الوصول للمستوى التالي = تخسر كل شيء!`;
        } else {
            // رسالة مختصرة جداً للمرات التالية
            if (level.percent < 100) {
                const nextLevel = level.percent === 10 ? 25 : level.percent === 25 ? 50 : level.percent === 50 ? 75 : 100;
                infoMessage = `انسحاب آمن أم متابعة للمستوى ${nextLevel}%؟`;
            } else {
                infoMessage = `انسحاب آمن أم متابعة للإنجاز النهائي؟`;
            }
        }

        // النص التفصيلي - بعيداً عن الثلاث جمل الأساسية
        const questionText = this.add.text(centerX, GAME_CONFIG.height / 2, infoMessage, {
            fontSize: '11px', // حجم مناسب للدقة HD
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            lineSpacing: 12,
            wordWrap: { width: GAME_CONFIG.width / 2 }, // نصف الشاشة
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        questionText.setDepth(55);
        
        // الجملة الثالثة: ماذا تقرر؟ - تحت الثانية مباشرة
        const choiceText = this.add.text(centerX, 350, 'ماذا تقرر؟', {
            fontSize: '13px', // حجم مناسب للدقة HD
            fill: '#ffdd44',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
        }).setOrigin(0.5);
        choiceText.setDepth(55);



        // عد تنازلي للقرار - في الأسفل أكثر
        let countdown = 15;
        const countdownText = this.add.text(centerX, GAME_CONFIG.height - 200, `الوقت المتبقي: ${countdown} ثانية`, {
            fontSize: '18px', // حجم مناسب للدقة HD
            fill: '#ffaa00',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5);
        countdownText.setDepth(55);

        // مؤقت العد التنازلي
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            repeat: 14,
            callback: () => {
                countdown--;
                countdownText.setText(`الوقت المتبقي: ${countdown} ثانية`);
                
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
                    withdrawBg.destroy();
                    withdrawBtn.destroy();
                    continueBg.destroy();
                    continueBtn.destroy();
                }
            }
        });

        // أزرار الاختيار في أسفل الشاشة مع خلفية ملونة
        
        // خلفية زر الانسحاب (أخضر آمن)
        const withdrawBg = this.add.graphics();
        withdrawBg.fillStyle(0x27ae60, 0.9); // أخضر من ألوان اللعبة
        withdrawBg.lineStyle(4, 0x2ecc71, 1);
        withdrawBg.fillRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
        withdrawBg.strokeRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
        withdrawBg.setDepth(59);
        
        const withdrawBtn = this.add.text(centerX - 300, GAME_CONFIG.height - 110, 'انسحب الآن', {
            fontSize: '18px', // حجم مناسب للدقة HD
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        withdrawBtn.setDepth(60);

        // خلفية زر المتابعة (أحمر تحذيري)
        const continueBg = this.add.graphics();
        continueBg.fillStyle(0xe74c3c, 0.9); // أحمر من ألوان اللعبة
        continueBg.lineStyle(4, 0xc0392b, 1);
        continueBg.fillRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
        continueBg.strokeRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
        continueBg.setDepth(59);
        
        const continueBtn = this.add.text(centerX + 300, GAME_CONFIG.height - 110, 'أكمل اللعب', {
            fontSize: '18px', // حجم مناسب للدقة HD
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
        continueBtn.setDepth(60);

        // تأثيرات تفاعلية محسنة للأزرار
        withdrawBtn.on('pointerover', () => { 
            withdrawBtn.setScale(1.1);
            withdrawBg.setScale(1.05);
            withdrawBg.clear();
            withdrawBg.fillStyle(0x2ecc71, 1); // أخضر أكثر إشراقاً
            withdrawBg.lineStyle(4, 0x27ae60, 1);
            withdrawBg.fillRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
            withdrawBg.strokeRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
            if (this.sounds && this.sounds.collect) this.sounds.collect.play(); 
        });
        withdrawBtn.on('pointerout', () => { 
            withdrawBtn.setScale(1);
            withdrawBg.setScale(1);
            withdrawBg.clear();
            withdrawBg.fillStyle(0x27ae60, 0.9);
            withdrawBg.lineStyle(4, 0x2ecc71, 1);
            withdrawBg.fillRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
            withdrawBg.strokeRoundedRect(centerX - 400, GAME_CONFIG.height - 150, 200, 80, 15);
        });

        continueBtn.on('pointerover', () => { 
            continueBtn.setScale(1.1);
            continueBg.setScale(1.05);
            continueBg.clear();
            continueBg.fillStyle(0xc0392b, 1); // أحمر أكثر إشراقاً
            continueBg.lineStyle(4, 0xe74c3c, 1);
            continueBg.fillRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
            continueBg.strokeRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
            if (this.sounds && this.sounds.collect) this.sounds.collect.play(); 
        });
        continueBtn.on('pointerout', () => { 
            continueBtn.setScale(1);
            continueBg.setScale(1);
            continueBg.clear();
            continueBg.fillStyle(0xe74c3c, 0.9);
            continueBg.lineStyle(4, 0xc0392b, 1);
            continueBg.fillRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
            continueBg.strokeRoundedRect(centerX + 200, GAME_CONFIG.height - 150, 200, 80, 15);
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
            withdrawBg.destroy();
            withdrawBtn.destroy();
            continueBg.destroy();
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
            withdrawBg.destroy();
            withdrawBtn.destroy();
            continueBg.destroy();
            continueBtn.destroy();
        });

        // حفظ مراجع للحوار لحذفه لاحقاً
        this.currentDialog = {
            bg: dialogBg,
            box: null,
            texts: [titleText, rewardText, questionText, choiceText, countdownText],
            buttons: [withdrawBtn, continueBtn],
            timer: countdownTimer
        };
    }

    addDiamondEffects(goldenItem) {
        // تأثيرات الماس المتقدمة للوجبة المجانية
        const glowEffect = this.add.graphics();
        
        // حلقات متوهجة متعددة
        glowEffect.lineStyle(10, 0xFFD700, 0.9);
        glowEffect.strokeCircle(0, 0, 90);
        glowEffect.lineStyle(6, 0xFFFFFF, 0.8);
        glowEffect.strokeCircle(0, 0, 65);
        glowEffect.lineStyle(4, 0xFFFACD, 0.9);
        glowEffect.strokeCircle(0, 0, 40);
        glowEffect.setDepth(99);
        
        // ربط التأثيرات بالساندوتش
        goldenItem.glowEffect = glowEffect;
        goldenItem.updateGlow = this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
                if (goldenItem.active) {
                    glowEffect.x = goldenItem.x;
                    glowEffect.y = goldenItem.y;
                } else {
                    glowEffect.destroy();
                }
            }
        });
        
        // تم إزالة الدوران - الساندوتش ينزل طبيعياً
        
        // تم إزالة النبضة - حجم ثابت
        
        // وميض الماس
        this.tweens.add({
            targets: glowEffect,
            alpha: 0.4,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });
    }
    
    addGoldenParticles(goldenItem) {
        // إنشاء جزيئات ذهبية متطايرة حول الساندوتش
        const particles = [];
        const particleCount = 6;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(0xFFD700, 0.8);
            particle.fillCircle(0, 0, 3);
            particle.setDepth(98);
            particles.push(particle);
            
            // حركة دائرية حول الساندوتش
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 40;
            
            particle.baseAngle = angle;
            particle.radius = radius;
        }
        
        // تحديث مواقع الجزيئات
        goldenItem.particles = particles;
        goldenItem.particleTimer = this.time.addEvent({
            delay: 50,
            repeat: -1,
            callback: () => {
                if (!goldenItem.active) {
                    particles.forEach(p => p.destroy());
                    return;
                }
                
                particles.forEach((particle, index) => {
                    const time = this.time.now * 0.003;
                    const angle = particle.baseAngle + time;
                    
                    particle.x = goldenItem.x + Math.cos(angle) * particle.radius;
                    particle.y = goldenItem.y + Math.sin(angle) * particle.radius;
                    
                    // تأثير نبض
                    const pulseScale = 1 + Math.sin(time * 3 + index) * 0.3;
                    particle.setScale(pulseScale);
                });
            }
        });
        
        // تنظيف الجزيئات عند تدمير الساندوتش
        goldenItem.on('destroy', () => {
            if (goldenItem.particles) {
                goldenItem.particles.forEach(p => p.destroy());
            }
            if (goldenItem.particleTimer) {
                goldenItem.particleTimer.destroy();
            }
        });
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
        
        // 🎯 بعد قرار الاستمرار - الساندوتش الذهبي يظهر دائماً!
        this.triggerUnifiedGoldenSandwich(); // الساندوتش الموحد يظهر دائماً
        console.log('🎯 الساندوتش الذهبي الموحد تم إطلاقه - صعب الالتقاط!');
        
        // زيادة الصعوبة حسب المستوى
        this.increaseDifficulty(level.difficulty);
        
        // استئناف اللعبة
        this.spawnTimer.paused = false;
        this.physics.resume();
        
        // تشغيل صوت المواصلة
        this.sounds.bad.play(); // صوت تحذيري
        
        // تم دمج السندوتش الذهبي مع المجاني في دالة واحدة موحدة
        
        // عرض رسالة تشجيعية
        this.showEncouragementMessage(level);
    }
    
    triggerUnifiedGoldenSandwich() {
        // الساندوتش الذهبي الموحد - نادر جداً وصعب للغاية!
        console.log('🏆 إطلاق الساندوتش الذهبي الموحد!');
        
        // تحديد نوع الجائزة بشكل عشوائي
        const canGetFreeMeal = this.gameManager.canGetFreeSandwich();
        const freeMealsLeft = 2 - this.gameManager.freeSandwichesUsed;
        
        // نظام الجوائز العشوائي - مع حماية من الوجبات المجانية
        const randomChance = Math.random() * 100;
        let prizeType, prizeMessage, prizeColor;
        
        if (canGetFreeMeal && randomChance < 15) { // 15% وجبة مجانية (فقط إذا متاحة!)
            prizeType = 'freeMeal';
            prizeMessage = 'وجبة مجانية!';
            prizeColor = '#FFD700'; // ذهبي فقط للساندوتش
        } else if (randomChance < 57.5) { // إعادة توزيع النسب عند عدم توفر وجبات مجانية
            // خصم 3% (42.5% من المتبقي)
            prizeType = 'discount3';
            prizeMessage = 'خصم 3%!';
            prizeColor = '#FFD700'; // نفس اللون الذهبي
        } else { // 42.5% خصم 1.5%
            prizeType = 'discount1_5';
            prizeMessage = 'خصم 1.5%!';
            prizeColor = '#FFD700'; // نفس اللون الذهبي
        }
        
        // تأخير عشوائي لجعل الظهور غير متوقع
        const randomDelay = Math.random() * 3000 + 500; // من نصف ثانية إلى 3.5 ثانية
        this.time.addEvent({
            delay: randomDelay,
            callback: () => {
                // فحص مرة أخرى قبل الإنشاء - ضمان إضافي!
                const finalCanGetFreeMeal = this.gameManager.canGetFreeSandwich();
                
                // إذا كانت الجائزة وجبة مجانية بس الحد خلص - غير الجائزة!
                if (prizeType === 'freeMeal' && !finalCanGetFreeMeal) {
                    // تحويل لخصم 3% بدلاً من الوجبة المجانية
                    prizeType = 'discount3';
                    prizeMessage = 'خصم 3%!';
                    prizeColor = '#FFD700';
                    console.log('🔄 تم تغيير الجائزة من وجبة مجانية إلى خصم 3% - الحد اليومي انتهى');
                }
                
                const gameAreaWidth = GAME_CONFIG.width - 180; // حتى الخط الذهبي
                const x = Math.random() * (gameAreaWidth - 50) + 25; // مكان عشوائي
                
                // إنشاء الساندوتش الذهبي باستخدام صورة Gold.png المخصوصة + تأثيرات ذهبية
                const goldenItem = this.physics.add.sprite(x, -30, 'goldenSandwich');
                goldenItem.itemType = 'unifiedGolden';
                goldenItem.isUnifiedGoldenSandwich = true;
                goldenItem.prizeType = prizeType;
                goldenItem.prizeMessage = prizeMessage;
                goldenItem.prizeColor = prizeColor;
                
                // سرعة عالية جداً لتحدي أكبر!
                goldenItem.setVelocityY(3000); // سرعة ثابتة عالية
                
                // بدون حركة جانبية - مسار مستقيم ثابت
                goldenItem.setVelocityX(0);
                
                // حجم أكبر ليكون واضح جداً
                goldenItem.setScale(0.35); // حجم أكبر بوضوح! ⭐
                goldenItem.setDepth(100); // فوق كل شيء
                
                // صورة Gold.png الأصلية بدون أي تأثيرات أو تلوين
                
                // ساندوتش ذهبي بسيط - صورة Gold.png فقط بدون مؤثرات
                
                // ساندوتش ذهبي بسيط بدون مؤثرات معقدة
                
                // إضافة للمجموعة
                this.fallingItems.add(goldenItem);
                goldenItem.hasDropped = false;
                goldenItem.isCollected = false;
                
                // إضافة مؤقت للاختفاء السريع
                this.time.addEvent({
                    delay: canGetFreeMeal ? 4000 : 2500, // وقت أطول للوجبة المجانية، أقل للخصمات
                    callback: () => {
                        if (goldenItem && goldenItem.active) {
                            // إضافة تأثير اختفاء
                            this.tweens.add({
                                targets: goldenItem,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => goldenItem.destroy()
                            });
                            this.showMessage('الساندوتش الذهبي اختفى! كان سريع جداً!', 1500, '#ff6600');
                        }
                    }
                });
                
                goldenItem.dropChecker = this.time.addEvent({
                    delay: 30, // فحص أسرع جداً للسندوتشات السريعة
                    repeat: -1,
                    callback: () => {
                        if (goldenItem && goldenItem.active && !goldenItem.isCollected && !goldenItem.hasDropped) {
                            if (goldenItem.y >= GAME_CONFIG.height - 50) { // السندوتش يُفقد عندما يمر البوكس بـ50 بكسل
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
                
                // الإشعار سيظهر فقط عند الالتقاط - لا نظهر شيء هنا
            }
        });
    }
    
    increaseDifficulty(difficulty) {
        // لا توجد معالجة خاصة - صعوبة تدريجية للمحترفين فقط! 🔥
        console.log(`🔥 الصعوبة زادت للمحترفين! المستوى: ${difficulty}`);
    }
    
    // تم حذف جميع مودات السهولة - للمحترفين فقط! 🔥
    
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
        const congratsText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 300, 
            `مبروك!\n${level.reward}`, {
            fontSize: '24px', // حجم مناسب للدقة HD
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center',
            stroke: '#27ae60',
            strokeThickness: 4,
            lineSpacing: 15,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 6, fill: true }
        }).setOrigin(0.5);
        
        // رسالة تهنئة بسيطة
        const messageText = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 50, 
            'تهانينا على الفوز!\nشكراً لك على اللعب', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2,
            lineSpacing: 15,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        
        // زر إعادة اللعب
        const restartBtn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 + 250, 
            'العب مرة أخرى', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#8B4513',
            padding: { x: 30, y: 15 }
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
        if (item.itemType === 'good') {
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
                // تم حذف goldenCaught - نستخدم النظام الموحد فقط
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
            
            // لا توجد مودات سهولة - للمحترفين فقط!
            
            // التأكد من حالة gameManager
            if (this.gameManager) {
                this.gameManager.isInRiskMode = false;
                this.gameManager.currentRiskLevel = null;
            }
            
            console.log('🎮 تم تهيئة اللعبة للبداية - وضع طبيعي');
        } catch (error) {
            console.error('❌ خطأ أثناء تهيئة اللعبة:', error);
        }
    }
    
    // ===== نظام الساندوتش المجاني النادر 🎁 =====
    
    // تم حذف النظام القديم triggerFreeSandwichEvent - نستخدم triggerUnifiedGoldenSandwich فقط
    
    // تم حذف النظام القديم showFreeSandwichMessage - نستخدم triggerUnifiedGoldenSandwich فقط
    
    // تم حذف النظام القديم launchFreeSandwich - نستخدم triggerUnifiedGoldenSandwich فقط
    
    // تم حذف النظام القديم triggerFreeSandwichEvent الثاني - نستخدم triggerUnifiedGoldenSandwich فقط
    triggerFreeSandwichEventOLD() {
        // النظام القديم محذوف
        
        // إنشاء الساندوتش المجاني الخاص
        const freeSandwich = this.physics.add.sprite(
            Phaser.Math.Between(100, GAME_CONFIG.width - 100),
            -50,
            'sandwich1'
        );
        
        // مظهر خاص للساندوتش المجاني - كقطعة ماس ذهبية! ✨💎
        freeSandwich.setDisplaySize(90, 90); // حجم أصغر للمهارة! 💎
        freeSandwich.setTint(0xFFD700); // لون ذهبي براق
        freeSandwich.isFreeSandwich = true;
        freeSandwich.canBeCaught = canCatch;
        freeSandwich.setDepth(100); // فوق كل شيء
        
        // تأثير الإضاءة الماسية المتقدم - وهج ذهبي متألق مضاعف!
        const glowEffect = this.add.graphics();
        // الحلقة الخارجية - ذهبية كبيرة
        glowEffect.lineStyle(12, 0xFFD700, 0.9);
        glowEffect.strokeCircle(0, 0, 100);
        // الحلقة المتوسطة - بيضاء متوهجة
        glowEffect.lineStyle(8, 0xFFFFFF, 0.8); 
        glowEffect.strokeCircle(0, 0, 75);
        // الحلقة الداخلية - ذهبية مركزة
        glowEffect.lineStyle(6, 0xFFFACD, 0.9);
        glowEffect.strokeCircle(0, 0, 50);
        glowEffect.setDepth(99);
        
        // ربط التأثير بالساندوتش
        const updateGlow = () => {
            if (freeSandwich.active) {
                glowEffect.x = freeSandwich.x;
                glowEffect.y = freeSandwich.y;
            } else {
                glowEffect.destroy();
            }
        };
        
        // تحديث مستمر لموضع التأثير
        freeSandwich.updateGlow = this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: updateGlow
        });
        
        // تأثير دوران سحري
        this.tweens.add({
            targets: freeSandwich,
            rotation: Math.PI * 4, // دوران مضاعف
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // تأثير نبضة متألقة
        this.tweens.add({
            targets: freeSandwich,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // تأثير وميض الماس المضاعف
        this.tweens.add({
            targets: glowEffect,
            alpha: 0.3,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });
        
        // تأثير تألق السندوتش نفسه
        this.tweens.add({
            targets: freeSandwich,
            alpha: 0.7,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // تأثير لمعان إضافي للون
        let colorShift = 0;
        freeSandwich.colorTimer = this.time.addEvent({
            delay: 200,
            repeat: -1,
            callback: () => {
                colorShift += 0.1;
                const golden = Phaser.Display.Color.HSVToRGB(0.15 + Math.sin(colorShift) * 0.05, 1, 1);
                freeSandwich.setTint(golden.color);
            }
        });
        
        // فيزياء السقوط
        freeSandwich.setVelocityY(dropSpeed);
        freeSandwich.setVelocityX(Phaser.Math.Between(-100, 100)); // حركة جانبية خفيفة
        
        // إضافة للمجموعة
        this.fallingItems.add(freeSandwich);
        
        // تشغيل صوت خاص
        if (this.sounds.golden) {
            this.sounds.golden.play();
        }
        
        // حفظ مرجع للتأثيرات للتنظيف اللاحق
        freeSandwich.glowEffect = glowEffect;
        
        // حفظ مرجع لكل التأثيرات للتنظيف
        freeSandwich.allEffects = [glowEffect];
        
        // إزالة تلقائية إذا خرج من الشاشة مع تنظيف التأثيرات
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                if (freeSandwich && freeSandwich.active) {
                    // تنظيف شامل لكل التأثيرات
                    if (freeSandwich.updateGlow) {
                        freeSandwich.updateGlow.destroy();
                    }
                    if (freeSandwich.colorTimer) {
                        freeSandwich.colorTimer.destroy();
                    }
                    if (freeSandwich.glowEffect) {
                        freeSandwich.glowEffect.destroy();
                    }
                    if (freeSandwich.allEffects) {
                        freeSandwich.allEffects.forEach(effect => {
                            if (effect && effect.destroy) effect.destroy();
                        });
                    }
                    freeSandwich.destroy();
                }
            }
        });
    }

    // تم حذف النظام القديم triggerFreeSandwichEvent الثاني - نستخدم triggerUnifiedGoldenSandwich فقط
}

// إعداد وتشغيل اللعبة - محسّنة للـ WebView
const gameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
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
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'gameContainer',
        width: 1280,
        height: 720,
        min: {
            width: 800,
            height: 600
        },
        max: {
            width: 1280,
            height: 720
        },
        expandParent: false,
        autoRound: true
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true
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
