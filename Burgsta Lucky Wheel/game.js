// ===== مدير إعدادات اللعبة وإدارة البيانات =====
class GameManager {
    constructor() {
        this.settings = null;
        this.dailyLimits = {};
        this.colors = {
            primary: '#c49b41',    // ذهبي
            secondary: '#f5f1e6',  // بيج فاتح
            dark: '#8b6914',       // ذهبي داكن
            light: '#fff9e6',      // بيج فاتح جداً
            text: '#5d4e37',       // بني داكن للنص
            accent: '#d4af37'      // ذهبي مضيء
        };
    }

    async loadSettings() {
        try {
            // تحميل الإعدادات (بدون تعديل على الرابط - لا نضيف cache-busting هنا)
            const response = await fetch('./settings.json');
            this.settings = await response.json();
            this.initializeDailyLimits();
            return true;
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
            return false;
        }
    }

    initializeDailyLimits() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('burgsta_date');

    // لا نجبر على إعادة تعيين بيانات المستخدم تلقائياً
    // التحقق من تطابق الجوائز المحفوظة مع الإعدادات الحالية
    const savedLimits = localStorage.getItem('burgsta_daily_limits');
    let needsReset = false; // لا نجبر على إعادة التعيين
        
        if (savedLimits) {
            const parsed = JSON.parse(savedLimits);
            const currentPrizes = Object.keys(this.settings.daily_limits);
            const savedPrizes = Object.keys(parsed);
            
            // إذا اختلفت الجوائز، امسح البيانات المحفوظة
            if (currentPrizes.length !== savedPrizes.length || 
                !currentPrizes.every(prize => savedPrizes.includes(prize))) {
                needsReset = true;
                console.log('🔄 تم اكتشاف تحديث في الجوائز، إعادة تعيين البيانات...');
            }
        }
        
        // إذا كان يوم جديد أو تحديث في الجوائز، قم بتصفير العد
        if (savedDate !== today || needsReset) {
            localStorage.setItem('burgsta_date', today);
            localStorage.removeItem('burgsta_daily_limits');
            this.dailyLimits = { ...this.settings.daily_limits };
            this.saveDailyLimits();
        } else if (savedLimits) {
            this.dailyLimits = JSON.parse(savedLimits);
        } else {
            this.dailyLimits = { ...this.settings.daily_limits };
            this.saveDailyLimits();
        }
    }

    saveDailyLimits() {
        localStorage.setItem('burgsta_daily_limits', JSON.stringify(this.dailyLimits));
    }

    getAvailablePrizes() {
        if (!this.dailyLimits || Object.keys(this.dailyLimits).length === 0) {
            return [];
        }
        return Object.keys(this.dailyLimits).filter(prize => this.dailyLimits[prize] > 0);
    }

    consumePrize(prizeName) {
        if (this.dailyLimits[prizeName] > 0) {
            this.dailyLimits[prizeName]--;
            this.saveDailyLimits();
            
            // TODO: ربط مع API لتسجيل الجائزة
            // await this.sendPrizeToAPI(prizeName);
            
            return true;
        }
        return false;
    }

    // دالة مستقبلية للربط مع API
    async sendPrizeToAPI(prizeName) {
        try {
            const response = await fetch('/api/prizes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_TOKEN' // استبدل بالتوكن الخاص بك
                },
                body: JSON.stringify({
                    prize: prizeName,
                    timestamp: new Date().toISOString(),
                    user_id: 'USER_ID', // استبدل بمعرف المستخدم
                    restaurant: 'Burgsta'
                })
            });
            
            if (!response.ok) {
                throw new Error('فشل في إرسال الجائزة إلى الخادم');
            }
            
            return await response.json();
        } catch (error) {
            console.error('خطأ في إرسال الجائزة:', error);
            // يمكنك إضافة نظام إعادة المحاولة هنا
        }
    }

    selectPrize() {
        const availablePrizes = this.getAvailablePrizes();
        
        // ✅ حماية مطلقة: لا توجد جوائز متاحة = إرجاع null
        if (availablePrizes.length === 0) {
            // لا توجد جوائز متاحة
            return null; // لا توجد جوائز متاحة
        }

        // التحقق من وجود الإعدادات
        if (!this.settings || !this.settings.probabilities) {
            return availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
        }

        // حساب الاحتماليات للجوائز المتاحة فقط
        const totalProbability = availablePrizes.reduce((sum, prize) => {
            const probability = this.settings.probabilities[prize] || 0;
            return sum + probability;
        }, 0);

        if (totalProbability === 0) {
            // إذا لم تكن هناك احتماليات، اختر عشوائياً
            return availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
        }

        const random = Math.random() * totalProbability;
        let cumulative = 0;

        for (const prize of availablePrizes) {
            const probability = this.settings.probabilities[prize] || 0;
            cumulative += probability;
            if (random <= cumulative) {
                return prize;
            }
        }

        return availablePrizes[0]; // احتياطي
    }

    calculateIntelligentProbabilities() {
        const availablePrizes = this.getAvailablePrizes();
        
        // ✅ حماية مطلقة: إذا انتهت كل الجوائز = 100% حاول في وقت لاحق (لا توجد جوائز للفوز بها)
        if (availablePrizes.length === 0) {
            // جميع الجوائز انتهت
            return { tryLaterChance: 1.0, shouldUseLuck: false };
        }

        // حساب إجمالي الجوائز المتاحة والمستهلكة
        const totalAvailableCount = availablePrizes.reduce((sum, prize) => {
            return sum + (this.dailyLimits[prize] || 0);
        }, 0);

        const totalOriginalCount = Object.values(this.settings.daily_limits || {}).reduce((sum, limit) => sum + limit, 0);
        const consumedCount = totalOriginalCount - totalAvailableCount;
        const consumptionRatio = consumedCount / totalOriginalCount;

        // 🤖 نظام الكرم التلقائي الذكي - يتكيف مع عدد الجوائز
        const totalDailyPrizes = Object.values(this.settings.daily_limits || {}).reduce((sum, limit) => sum + limit, 0);
        
        // تحديد مستوى كرم اللعبة بناءً على إجمالي الجوائز اليومية
        let generosityLevel;
        let baseGenerosity;
        let scarcityMultiplier;
        
        if (totalDailyPrizes <= 9) {
            // مطعم صغير جداً جداً - بخيل جداً جداً لحماية الجوائز القليلة
            generosityLevel = "بخيل جداً جداً";
            baseGenerosity = 0.85; // 85% حاول لاحقاً في البداية
            scarcityMultiplier = 4.5;
            // تم تحديد النمط: بخيل جداً جداً
        } else if (totalDailyPrizes <= 20) {
            // مطعم صغير - بخيل جداً حسب طلب المستخدم (10-20 جوائز = بخيل جداً)
            generosityLevel = "بخيل جداً";
            baseGenerosity = 0.75; // 75% حاول لاحقاً في البداية
            scarcityMultiplier = 4.0;
            // تم تحديد النمط: بخيل جداً
        } else if (totalDailyPrizes <= 35) {
            // مطعم متوسط صغير - بخيل لحماية الميزانية
            generosityLevel = "بخيل";
            baseGenerosity = 0.55; // 55% حاول لاحقاً في البداية
            scarcityMultiplier = 3.0;
            // تم تحديد النمط: بخيل
        } else if (totalDailyPrizes <= 60) {
            // مطعم متوسط - متوازن
            generosityLevel = "متوسط";
            baseGenerosity = 0.35; // 35% حاول لاحقاً في البداية
            scarcityMultiplier = 2.0;
            // تم تحديد النمط: متوسط
        } else if (totalDailyPrizes <= 100) {
            // مطعم كبير - كريم
            generosityLevel = "كريم";
            baseGenerosity = 0.20; // 20% حاول لاحقاً في البداية
            scarcityMultiplier = 1.5;
            // تم تحديد النمط: كريم
        } else {
            // مطعم ضخم - كريم جداً
            generosityLevel = "كريم جداً";
            baseGenerosity = 0.10; // 10% حاول لاحقاً في البداية
            scarcityMultiplier = 1.0;
            // تم تحديد النمط: كريم جداً
        }

        // حساب متوسط قيمة الجوائز المتاحة
        const totalValue = availablePrizes.reduce((sum, prize) => {
            return sum + (this.settings.prize_values?.[prize] || 50);
        }, 0);
        const avgPrizeValue = totalValue / availablePrizes.length;

        // حساب الاحتمالية الذكية
        let tryLaterChance = baseGenerosity;

        // زيادة الاحتمالية مع زيادة الاستهلاك (أقوى مع المطاعم الصغيرة)
        const consumptionBonus = consumptionRatio * scarcityMultiplier * baseGenerosity;
        tryLaterChance += consumptionBonus;

        // تعديل بناءً على قيمة الجوائز المتبقية (الأغلى = أصعب)
        if (avgPrizeValue > 50) {
            const valueMultiplier = Math.min(avgPrizeValue / 50, 2.5);
            tryLaterChance *= valueMultiplier;
        }

        // حدود ذكية بناءً على مستوى الكرم
        let minChance, maxChance;
        if (generosityLevel === "بخيل جداً جداً") {
            minChance = 0.75; maxChance = 0.98;
        } else if (generosityLevel === "بخيل جداً") {
            minChance = 0.65; maxChance = 0.95;
        } else if (generosityLevel === "بخيل") {
            minChance = 0.45; maxChance = 0.88;
        } else if (generosityLevel === "متوسط") {
            minChance = 0.25; maxChance = 0.75;
        } else if (generosityLevel === "كريم") {
            minChance = 0.15; maxChance = 0.65;
        } else {
            minChance = 0.05; maxChance = 0.55;
        }
        
        tryLaterChance = Math.min(Math.max(tryLaterChance, minChance), maxChance);

        // تم حساب الإحصائيات

        // قرار استخدام "حظ سعيد" بدلاً من جائزة حقيقية (أقل مع المطاعم الصغيرة)
        const luckChance = generosityLevel === "بخيل جداً جداً" ? 0.01 : 
                          generosityLevel === "بخيل جداً" ? 0.02 : 
                          generosityLevel === "بخيل" ? 0.03 : 
                          0.05 + (consumptionRatio * 0.1);
        const shouldUseLuck = Math.random() < luckChance;

        return { tryLaterChance, shouldUseLuck };
    }

    selectPrizeWithValueWeight() {
        const availablePrizes = this.getAvailablePrizes();
        
        // ✅ حماية مطلقة: لا توجد جوائز متاحة = إرجاع null
        if (availablePrizes.length === 0) {
            // لا توجد جوائز متاحة للاختيار
            return null;
        }

        // التحقق من وجود الإعدادات
        if (!this.settings || !this.settings.probabilities || !this.settings.prize_values) {
            return this.selectPrize(); // العودة للطريقة القديمة
        }

        // تعديل الاحتماليات بناءً على قيمة الجائزة (الأغلى أصعب)
        const adjustedProbabilities = {};
        
        for (const prize of availablePrizes) {
            const baseProbability = this.settings.probabilities[prize] || 0;
            const prizeValue = this.settings.prize_values[prize] || 50;
            
            // تقليل الاحتمالية للجوائز الأغلى (عكسياً)
            const valueAdjustment = 100 / Math.max(prizeValue, 1);
            adjustedProbabilities[prize] = baseProbability * valueAdjustment;
        }

        // حساب المجموع الجديد
        const totalAdjustedProbability = Object.values(adjustedProbabilities).reduce((sum, prob) => sum + prob, 0);

        if (totalAdjustedProbability === 0) {
            return availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
        }

        // الاختيار العشوائي المرجح
        const random = Math.random() * totalAdjustedProbability;
        let cumulative = 0;

        for (const prize of availablePrizes) {
            cumulative += adjustedProbabilities[prize];
            if (random <= cumulative) {
                return prize;
            }
        }

        return availablePrizes[0];
    }

    // 🔒 دالة آمنة للاختيار من الجوائز المتاحة المؤكدة
    selectSafeAvailablePrize(confirmedAvailablePrizes) {
        if (!confirmedAvailablePrizes || confirmedAvailablePrizes.length === 0) {
            // لا توجد جوائز مؤكدة للاختيار الآمن
            return null;
        }

        // التحقق النهائي من توفر كل جائزة قبل الاختيار
        const trulyAvailablePrizes = confirmedAvailablePrizes.filter(prize => {
            return this.dailyLimits[prize] && this.dailyLimits[prize] > 0;
        });

        if (trulyAvailablePrizes.length === 0) {
            // لا توجد جوائز متاحة حقاً للاختيار الآمن
            return null;
        }

        // استخدام نفس منطق الاحتماليات لكن مع الجوائز المؤكدة فقط
        if (!this.settings || !this.settings.probabilities || !this.settings.prize_values) {
            // اختيار عشوائي بسيط
            const randomIndex = Math.floor(Math.random() * trulyAvailablePrizes.length);
            return trulyAvailablePrizes[randomIndex];
        }

        // تطبيق الاحتماليات المرجحة على الجوائز المؤكدة
        const adjustedProbabilities = {};
        
        for (const prize of trulyAvailablePrizes) {
            const baseProbability = this.settings.probabilities[prize] || 0;
            const prizeValue = this.settings.prize_values[prize] || 50;
            
            // تقليل الاحتمالية للجوائز الأغلى
            const valueAdjustment = 100 / Math.max(prizeValue, 1);
            adjustedProbabilities[prize] = baseProbability * valueAdjustment;
        }

        // حساب المجموع والاختيار
        const totalAdjustedProbability = Object.values(adjustedProbabilities).reduce((sum, prob) => sum + prob, 0);

        if (totalAdjustedProbability === 0) {
            // اختيار عشوائي احتياطي
            const randomIndex = Math.floor(Math.random() * trulyAvailablePrizes.length);
            return trulyAvailablePrizes[randomIndex];
        }

        const random = Math.random() * totalAdjustedProbability;
        let cumulative = 0;

        for (const prize of trulyAvailablePrizes) {
            cumulative += adjustedProbabilities[prize];
            if (random <= cumulative) {
                // اختيار آمن تم
                return prize;
            }
        }

        // احتياطي نهائي
        return trulyAvailablePrizes[0];
    }
}

// ===== شاشة اللعبة الرئيسية =====



class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.wheel = null;
        this.isSpinning = false;
        this.prizes = [];
        this.sectorAngle = 0;
        this.playIcon = null;
        this.buttonCircle = null;
        this.glowTween = null;
        this.sounds = {};
        this.backgroundMusic = null;
        this.soundEnabled = true;
        this.audioContext = null;
        this.audioInitialized = false;
    }

    preload() {
        console.log('🔄 بدء تحميل الصور - WebView Enhanced v3');
        console.log('📱 تحسينات خاصة للـ WebView والصور العربية');
        
        // إضافة مؤشر تحميل بسيط
        const { width, height } = this.cameras.main;
        
        // خلفية تحميل
        const loadingBg = this.add.rectangle(width / 2, height / 2, width, height, 0x0D5016);
        
        // شريط تحميل ذهبي
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x1F1F1F, 0.9); // خلفية داكنة للشريط
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        // إطار ذهبي للشريط
        progressBox.lineStyle(3, 0xFFD700, 1);
        progressBox.strokeRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xFFD700, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            loadingBg.destroy();
            progressBar.destroy();
            progressBox.destroy();
        });

        // تحميل صور الهدايا بالأسماء العربية الجديدة (بدون %)
        console.log('📁 تحميل الصور بالأسماء الجديدة...');
        
        // تحميل صورة الوافل بالاسم العربي
        this.load.image('وافل شوكلاته', './images/وافل شوكلاته.png');
        console.log('✅ تم طلب تحميل: وافل شوكلاته');
        
        // تحميل صورة خصم 5% بالصورة الجديدة pngegg
        this.load.image('offer5', './images/pngegg.png');
        console.log('✅ تم طلب تحميل: pngegg (خصم 5%)');
        
        // تحميل صورة الموهيتو بالاسم العربي
        this.load.image('موهيتو', './images/موهيتو.png?v=3');
        console.log('✅ تم طلب تحميل: موهيتو');
        
        // تحميل صورة الدليفري بالاسم العربي
        this.load.image('دليفري', './images/دليفري.png?v=3');
        console.log('✅ تم طلب تحميل: دليفري');
        
        // تحميل صورة خصم 15% بالصورة الجديدة pngegg2
        this.load.image('offer15', './images/pngegg2.png');
        console.log('✅ تم طلب تحميل: pngegg2 (خصم 15%)');
        
        // تحميل صورة الأورجينال برجر بالاسم العربي
        this.load.image('اورجينال', './images/اورجينال.png');
        
        // تحميل صورة التشيكن لافا بالاسم العربي
        this.load.image('تشكن لافا', './images/تشكن لافا.png');
        
        // تحميل صورة الكومبو بالاسم العربي
        this.load.image('كومبو فري', './images/كومبو فري.png');
        
        // تحميل صورة "حاول وقت لاحق"
        this.load.image('حاول وقت لاحق', './images/حاول وقت لاحق.png');

        // إضافة مستمع للأخطاء مع تفاصيل أكثر للـ WebView
        this.load.on('loaderror', (file) => {
            console.error(`❌ فشل تحميل الصورة: ${file.key} من ${file.src}`);
            console.error(`📱 WebView Error: قد تكون مشكلة في الـ cache أو المسار`);
        });
        
        // إضافة مستمع لنجاح التحميل مع الأسماء الجديدة
        this.load.on('filecomplete', (key, type, data) => {
            if (type === 'image' && (key === 'offer5' || key === 'offer15')) {
                console.log(`✅ تم تحميل صورة الخصم ${key} بنجاح - شفافية محفوظة`);
            }
        });
    }

    // دالة خلط المصفوفات عشوائياً (Fisher-Yates shuffle)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    create() {
        const { width, height } = this.cameras.main;

        // خلفية متدرجة احترافية
        this.createProfessionalBackground(width, height);

        // تمت إزالة مؤشر التحديث المؤقت لعدم التأثير على واجهة المستخدم النهائية

        // شعار المطعم في الأعلى مع تأثير إضاءة
        const restaurantName = this.add.text(width / 2, 80, 'BURGSTA', {
            fontFamily: 'Cairo, Arial',
            fontSize: '48px', // حجم مناسب للدقة HD
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2, // سمك أقل للدقة الجديدة
            shadow: {
                offsetX: 6,
                offsetY: 6,
                color: 'rgba(0,0,0,0.3)',
                blur: 15,
                fill: true
            }
        }).setOrigin(0.5);

        // تأثير إضاءة متحرك لاسم المطعم
        this.tweens.add({
            targets: restaurantName,
            alpha: 0.7,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // عرض جميع الجوائز على العجلة مع إضافة "حاول في وقت لاحق"
        this.originalPrizes = Object.keys(gameManager.settings.probabilities || {});
        this.availablePrizes = gameManager.getAvailablePrizes();
        
        // 📊 مراقبة الهدايا المحملة
        console.log('🎁 الهدايا المحملة من الإعدادات:', this.originalPrizes);
        console.log('📋 الهدايا المتاحة:', this.availablePrizes);
        console.log('⚙️ إعدادات daily_limits:', gameManager.settings.daily_limits);
        
        // خلط الجوائز عشوائياً لتجنب التكرار المتوقع (خلط إضافي)
        let shuffledPrizes = this.shuffleArray([...this.originalPrizes]);
        shuffledPrizes = this.shuffleArray(shuffledPrizes); // خلط مزدوج للتأكد
        
        // إضافة الرسائل النظام في مواضع عشوائية
        const systemMessages = ["حاول في وقت لاحق ⏰"];
        
        // إضافة كل رسالة في موضع عشوائي
        systemMessages.forEach(message => {
            const positions = Array.from({length: shuffledPrizes.length + 1}, (_, i) => i);
            const shuffledPositions = this.shuffleArray(positions);
            const randomPosition = shuffledPositions[0];
            shuffledPrizes.splice(randomPosition, 0, message);
        });
        
        // خلط نهائي للتأكد من العشوائية الكاملة
        shuffledPrizes = this.shuffleArray(shuffledPrizes);
        
        // العجلة تعرض الجوائز مخلوطة عشوائياً
        this.allPrizes = shuffledPrizes;
        this.prizes = this.allPrizes;
        
        // تم تحميل الجوائز بنجاح وخلطها عشوائياً

        // زر البدء أولاً (ليكون خلف العجلة)
        this.createPlayButton(width, height);
        
        // إنشاء العجلة في المنتصف (فوق الزر)
        this.createWheel(width, height);
        
        // إضافة تأثيرات الإضاءة المحيطة
        this.createAmbientLighting(width, height);
        
        // إضافة زر التحكم بالصوت
        this.createSoundToggle(width, height);
        
        // إضافة مستمع لتهيئة الصوت عند أول نقرة
        this.initializeAudioOnFirstClick();
    }

    showNoMorePrizesMessage() {
        const { width, height } = this.cameras.main;
        
        this.add.text(width / 2, height / 2, 'عذراً! انتهت جميع الجوائز لليوم\nعد غداً للمزيد من المفاجآت', {
            fontFamily: 'Cairo, Arial',
            fontSize: '24px',
            color: gameManager.colors.text,
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
    }

    createProfessionalBackground(width, height) {
        // خلفية كازينو متدرجة (أخضر داكن إلى أخضر أفتح)
        const bgGradient = this.add.graphics();
        bgGradient.fillGradientStyle(0x0D5016, 0x126B1B, 0x0F5718, 0x0B4014, 1);
        bgGradient.fillRect(0, 0, width, height);

        // نقوش كازينو - معين الورق
        this.createCasinoPattern(width, height);

        // دوائر ذهبية لامعة كالكازينو (مقللة للسرعة)
        for (let i = 0; i < 4; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(3, 0xFFD700, 0.15); // ذهبي لامع
            const x = (width / 9) * (i + 1);
            const y = height / 6 + Math.sin(i) * 50;
            const radius = 40 + Math.random() * 30;
            circle.strokeCircle(x, y, radius);
            
            // تأثير حركة لطيفة للدوائر (مع تأخير)
            this.tweens.add({
                targets: circle,
                y: y + Math.sin(i) * 20,
                duration: 3000 + i * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 1000 + i * 200 // تأخير لتقليل الحمل
            });
        }

        // دوائر نحاسية في الأسفل (مقللة للسرعة)
        for (let i = 0; i < 3; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(2, 0xB8860B, 0.12); // نحاسي داكن
            const x = (width / 7) * (i + 1);
            const y = height * 5/6 + Math.cos(i) * 30;
            const radius = 25 + Math.random() * 20;
            circle.strokeCircle(x, y, radius);
            
            this.tweens.add({
                targets: circle,
                x: x + Math.cos(i) * 15,
                duration: 4000 + i * 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 1500 + i * 300 // تأخير إضافي
            });
        }

        // خطوط زخرفية ذهبية كالكازينو
        const decorLines = this.add.graphics();
        decorLines.lineStyle(2, 0xFFD700, 0.2); // خطوط ذهبية
        
        // خطوط علوية
        decorLines.moveTo(width / 2 - 250, 50);
        decorLines.lineTo(width / 2 - 80, 50);
        decorLines.moveTo(width / 2 + 80, 50);
        decorLines.lineTo(width / 2 + 250, 50);
        
        // خطوط سفلية
        decorLines.moveTo(width / 2 - 200, height - 50);
        decorLines.lineTo(width / 2 - 60, height - 50);
        decorLines.moveTo(width / 2 + 60, height - 50);
        decorLines.lineTo(width / 2 + 200, height - 50);
        
        decorLines.strokePath();

        // جسيمات ذهبية متحركة
        this.createFloatingParticles(width, height);
    }

    createFloatingParticles(width, height) {
        for (let i = 0; i < 6; i++) { // قللت من 12 إلى 6
            const particle = this.add.graphics();
            particle.fillStyle(0xFFD700, 0.4); // ذهبي أكثر إشراقاً
            const size = 2 + Math.random() * 3;
            particle.fillCircle(0, 0, size);
            
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            particle.setPosition(startX, startY);
            
            // حركة عائمة للجسيمات
            this.tweens.add({
                targets: particle,
                x: startX + (Math.random() - 0.5) * 200,
                y: startY + (Math.random() - 0.5) * 100,
                alpha: 0.2,
                duration: 8000 + Math.random() * 4000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000
            });
        }
    }

    createCasinoPattern(width, height) {
        // نقوش معين الورق (♦ ♠ ♥ ♣) كالكازينو
        const suits = ['♠', '♣', '♦', '♥'];
        const colors = [0xFFD700, 0xFF6B6B, 0xFFD700, 0xFF6B6B]; // ذهبي وأحمر
        
        // نقوش في الخلفية (مقللة للسرعة)
        for (let i = 0; i < 8; i++) {
            const suitIndex = i % 4;
            const suitText = this.add.text(
                Math.random() * width,
                Math.random() * height,
                suits[suitIndex],
                {
                    fontSize: '24px',
                    color: `#${colors[suitIndex].toString(16).padStart(6, '0')}`,
                    alpha: 0.08
                }
            );
            
            // حركة دوران بطيئة
            this.tweens.add({
                targets: suitText,
                rotation: Math.PI * 2,
                duration: 20000 + Math.random() * 10000,
                repeat: -1,
                ease: 'Linear'
            });
        }

        // خطوط شبكة كازينو رفيعة
        const grid = this.add.graphics();
        grid.lineStyle(1, 0xFFD700, 0.05);
        
        // خطوط عمودية (مقللة)
        for (let x = 200; x < width; x += 300) {
            grid.moveTo(x, 0);
            grid.lineTo(x, height);
        }
        
        // خطوط أفقية (مقللة)
        for (let y = 200; y < height; y += 300) {
            grid.moveTo(0, y);
            grid.lineTo(width, y);
        }
        
        grid.strokePath();
    }

    createWheel(width, height) {
        const centerX = width / 2;
        const centerY = height / 2 + 20; // موضع مناسب للدقة HD
        const radius = Math.min(width, height) * 0.3; // حجم أكبر نسبياً للدقة HD
        
        this.sectorAngle = 360 / this.prizes.length;
        
        // إنشاء حاوية العجلة
        this.wheel = this.add.container(centerX, centerY);
        
        // ألوان العجلة (مخلوطة عشوائياً لتنويع المظهر)
        const baseColors = [0xc49b41, 0xd4af37, 0x8b6914, 0xe8dcc0, 0xb8860b, 0xdaa520];
        const colors = this.shuffleArray([...baseColors]);

        // رسم العجلة مع تأثيرات احترافية
        for (let i = 0; i < this.prizes.length; i++) {
            const startAngle = (i * this.sectorAngle - 90) * Math.PI / 180;
            const endAngle = ((i + 1) * this.sectorAngle - 90) * Math.PI / 180;
            
            // ألوان خاصة للجوائز المحددة
            let color;
            let lighterColor;
            if (this.prizes[i] && this.prizes[i].includes('وافل شكولاته 🥞')) {
                color = 0x6a1b9a; // اللون البنفسجي للوافل
                lighterColor = 0x8b4dbf; // لون فاتح مناسب للوافل
            } else if (this.prizes[i] && this.prizes[i].includes('خصم 5% 💰')) {
                color = 0xff8c00; // اللون البرتقالي لخصم 5%
                lighterColor = 0xffa500; // برتقالي فاتح
            } else if (this.prizes[i] && this.prizes[i].includes('موهيتو فرى 🍹')) {
                color = 0xcceff5; // اللون الأزرق الفاتح للموهيتو
                lighterColor = 0xe0f7ff; // أزرق فاتح أكثر
            } else if (this.prizes[i] && this.prizes[i].includes('فرى دليفرى 🛵')) {
                color = 0x001f3f; // اللون الأزرق الداكن للدليفري
                lighterColor = 0x003d5c; // أزرق داكن أفتح قليلاً
            } else if (this.prizes[i] && this.prizes[i].includes('خصم 15% 💸')) {
                color = 0xff8c00; // اللون البرتقالي لخصم 15% (نفس لون خصم 5%)
                lighterColor = 0xffa500; // برتقالي فاتح
            } else if (this.prizes[i] && this.prizes[i].includes('اورجينال برجر 🍔')) {
                color = 0xd2b48c; // لون بني فاتح جميل للبرجر
                lighterColor = 0xe6d3b7; // بني فاتح أكثر
            } else if (this.prizes[i] && this.prizes[i].includes('كومبو فرى 🍟🧃')) {
                color = 0xdc143c; // لون أحمر للكومبو
                lighterColor = 0xff6b6b; // أحمر فاتح
            } else if (this.prizes[i] && this.prizes[i].includes('حاول في وقت لاحق')) {
                color = 0x000000; // لون أسود للخلفية
                lighterColor = 0x333333; // رمادي داكن للتدرج
            } else {
                color = colors[i % colors.length];
                // ألوان فاتحة مخلوطة عشوائياً لتجنب التكرار المتوقع
                const baseLighterColors = [0xe8dcc0, 0xf0e6d2, 0xd4c5a0, 0xc9b876, 0xf5f1e6, 0xede4d2];
                const lighterColors = this.shuffleArray([...baseLighterColors]);
                lighterColor = lighterColors[i % lighterColors.length];
            }
            
            // رسم القطاع مع تدرج لوني
            const sector = this.add.graphics();
            
            sector.fillGradientStyle(color, color, lighterColor, color, 0.9);
            sector.lineStyle(3, 0x8b6914, 1);
            sector.beginPath();
            sector.arc(0, 0, radius, startAngle, endAngle);
            sector.lineTo(0, 0);
            sector.closePath();
            sector.fillPath();
            sector.strokePath();

            // ظل داخلي للقطاع
            const innerShadow = this.add.graphics();
            innerShadow.lineStyle(1, 0x000000, 0.1);
            innerShadow.beginPath();
            innerShadow.arc(0, 0, radius - 5, startAngle, endAngle);
            innerShadow.strokePath();
            
            // نص/صورة الجائزة
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.70; // أقرب للحافة مع العجلة الكبيرة
            const textX = Math.cos(textAngle) * textRadius;
            const textY = Math.sin(textAngle) * textRadius;
            
            // حساب حجم الخط بناءً على حجم العجلة للدقة HD
            const fontSize = Math.max(16, Math.min(24, radius / 8)); // حجم خط مناسب للدقة HD
            
            // إضافة صورة الجائزة إذا كانت متوفرة (خاصة للوافل)
            const prizeImageResult = this.addPrizeImage(textX, textY - fontSize * 0.3, this.prizes[i], radius);
            
            // الحصول على صورة الجائزة
            const prizeImage = prizeImageResult;
            
            // عرض النص دائماً، لكن إذا وجدت الصورة، نزل النص تحتها
            let displayText = this.prizes[i];
            
            // إذا كانت الصورة موجودة، لا نعرض نص للجوائز التي لها صور (باستخدام الأسماء الصحيحة مع الإيموجي)
            if (prizeImage && (this.prizes[i].includes('وافل شكولاته 🥞') || this.prizes[i].includes('خصم 5% 💰') || this.prizes[i].includes('موهيتو فرى 🍹') || this.prizes[i].includes('فرى دليفرى 🛵') || this.prizes[i].includes('خصم 15% 💸') || this.prizes[i].includes('اورجينال برجر 🍔') || this.prizes[i].includes('تشيكن لافا 🍔') || this.prizes[i].includes('كومبو فرى 🍟🧃') || this.prizes[i].includes('حاول في وقت لاحق'))) {
                displayText = ''; // لا نص - الصورة فقط
            }
            
            // إنشاء النص فقط إذا كان هناك نص للعرض
            let prizeText = null;
            if (displayText.trim() !== '') {
                prizeText = this.add.text(
                    textX, 
                    prizeImage ? textY + fontSize * 0.8 : textY, 
                    displayText, 
                    {
                        fontFamily: 'Cairo, Arial',
                        fontSize: `${fontSize}px`,
                        fontWeight: '700',
                        color: color === 0xe8dcc0 ? '#5d4e37' : '#ffffff',
                        align: 'center',
                        wordWrap: { width: radius * 0.35 }, // أوسع مع العجلة الكبيرة
                        stroke: color === 0xe8dcc0 ? '#ffffff' : '#8b6914',
                        strokeThickness: 2,
                        shadow: {
                            offsetX: 2,
                            offsetY: 2,
                            color: 'rgba(0,0,0,0.6)',
                            blur: 3,
                            fill: true
                        }
                    }
                ).setOrigin(0.5);
            }
            
            // إضافة جميع العناصر للعجلة
            if (prizeImage && prizeText) {
                this.wheel.add([sector, innerShadow, prizeImage, prizeText]);
            } else if (prizeImage) {
                this.wheel.add([sector, innerShadow, prizeImage]);
            } else if (prizeText) {
                this.wheel.add([sector, innerShadow, prizeText]);
            } else {
                this.wheel.add([sector, innerShadow]);
            }
        }

        // دائرة المركز مع تأثير ثلاثي الأبعاد (أكبر مع العجلة الجديدة)
        const centerRadius = Math.max(15, radius * 0.08);
        const centerOuter = this.add.graphics();
        centerOuter.fillGradientStyle(0x8b6914, 0x8b6914, 0xc49b41, 0xd4af37, 0.9);
        centerOuter.lineStyle(3, 0x6d5011);
        centerOuter.fillCircle(0, 0, centerRadius);
        centerOuter.strokeCircle(0, 0, centerRadius);

        const centerInner = this.add.graphics();
        centerInner.fillStyle(0xc49b41);
        centerInner.fillCircle(0, 0, centerRadius * 0.6);

        this.wheel.add([centerOuter, centerInner]);

        // إضافة ظل للعجلة الكاملة
        const wheelShadow = this.add.graphics();
        wheelShadow.fillStyle(0x000000, 0.15);
        wheelShadow.fillCircle(centerX + 8, centerY + 8, radius + 10);

        // المؤشر المحسن
        this.createEnhancedPointer(centerX, centerY, radius);
        
        // إضافة حلقة خارجية للعجلة
        const outerRing = this.add.graphics();
        outerRing.lineStyle(8, 0x8b6914);
        outerRing.strokeCircle(centerX, centerY, radius + 15);
        
        const outerRingGlow = this.add.graphics();
        outerRingGlow.lineStyle(4, 0xd4af37, 0.6);
        outerRingGlow.strokeCircle(centerX, centerY, radius + 20);
    }

    createEnhancedPointer(centerX, centerY, radius) {
        // حساب أبعاد المؤشر بناءً على حجم العجلة
        const pointerLength = radius * 0.12;
        const pointerWidth = radius * 0.08;
        const pointerOffset = radius + pointerLength * 0.8;
        
        // ظل المؤشر
        const pointerShadow = this.add.graphics();
        pointerShadow.fillStyle(0x000000, 0.3);
        pointerShadow.beginPath();
        pointerShadow.moveTo(centerX + 3, centerY - radius - 15);
        pointerShadow.lineTo(centerX - pointerWidth + 2, centerY - radius + 10);
        pointerShadow.lineTo(centerX + pointerWidth + 4, centerY - radius + 10);
        pointerShadow.closePath();
        pointerShadow.fillPath();

        // المؤشر الرئيسي مع تدرج (يشير للأسفل نحو العجلة)
        const pointer = this.add.graphics();
        pointer.fillGradientStyle(0xd4af37, 0xc49b41, 0x8b6914, 0x6d5011, 1);
        pointer.lineStyle(3, 0x6d5011);
        pointer.beginPath();
        pointer.moveTo(centerX, centerY - radius - 15);
        pointer.lineTo(centerX - pointerWidth, centerY - radius + 10);
        pointer.lineTo(centerX + pointerWidth, centerY - radius + 10);
        pointer.closePath();
        pointer.fillPath();
        pointer.strokePath();

        // تأثير توهج للمؤشر
        const pointerGlow = this.add.graphics();
        pointerGlow.fillStyle(0xd4af37, 0.4);
        const glowOffset = 4;
        pointerGlow.beginPath();
        pointerGlow.moveTo(centerX, centerY - radius - 15 - glowOffset);
        pointerGlow.lineTo(centerX - pointerWidth - glowOffset, centerY - radius + 10 - glowOffset);
        pointerGlow.lineTo(centerX + pointerWidth + glowOffset, centerY - radius + 10 - glowOffset);
        pointerGlow.closePath();
        pointerGlow.fillPath();
    }

    createPlayButton(width, height) {
        const buttonX = width / 2;
        const buttonY = height / 2 + 20; // نفس مكان العجلة الجديد للدقة HD
        const buttonSize = Math.max(50, Math.min(70, Math.min(width, height) * 0.08)); // حجم مناسب للدقة HD
        
        // ظل الزر
        const buttonShadow = this.add.graphics();
        buttonShadow.fillStyle(0x000000, 0.2);
        buttonShadow.fillCircle(buttonX + 4, buttonY + 4, buttonSize / 2);
        buttonShadow.setDepth(100);

        // دائرة الزر مع تدرج ثلاثي الأبعاد
        this.buttonCircle = this.add.graphics();
        this.buttonCircle.fillGradientStyle(0xd4af37, 0xc49b41, 0x8b6914, 0x6d5011, 1);
        this.buttonCircle.lineStyle(4, 0x6d5011);
        this.buttonCircle.fillCircle(buttonX, buttonY, buttonSize / 2);
        this.buttonCircle.strokeCircle(buttonX, buttonY, buttonSize / 2);
        this.buttonCircle.setDepth(101);

        // حلقة توهج خارجية
        const buttonGlow = this.add.graphics();
        buttonGlow.lineStyle(3, 0xd4af37, 0.6);
        buttonGlow.strokeCircle(buttonX, buttonY, (buttonSize / 2) + 8);
        buttonGlow.setDepth(102);

        // رمز تشغيل مع ظل وتوهج (حجم تكيفي)
        const iconScale = buttonSize / 60; // نسبة التكبير بناءً على الحجم الجديد
        const playIconShadow = this.add.graphics();
        playIconShadow.fillStyle(0x000000, 0.3);
        playIconShadow.beginPath();
        playIconShadow.moveTo(buttonX - 6 * iconScale, buttonY - 10 * iconScale);
        playIconShadow.lineTo(buttonX + 14 * iconScale, buttonY + 2 * iconScale);
        playIconShadow.lineTo(buttonX - 6 * iconScale, buttonY + 14 * iconScale);
        playIconShadow.closePath();
        playIconShadow.fillPath();
        playIconShadow.setDepth(103);

        this.playIcon = this.add.graphics();
        this.playIcon.fillStyle(0xffffff);
        this.playIcon.lineStyle(2 * iconScale, 0xe8dcc0);
        this.playIcon.beginPath();
        this.playIcon.moveTo(buttonX - 8 * iconScale, buttonY - 12 * iconScale);
        this.playIcon.lineTo(buttonX + 12 * iconScale, buttonY);
        this.playIcon.lineTo(buttonX - 8 * iconScale, buttonY + 12 * iconScale);
        this.playIcon.closePath();
        this.playIcon.fillPath();
        this.playIcon.strokePath();
        this.playIcon.setDepth(104);

        // تأثير التوهج
        this.glowTween = this.tweens.add({
            targets: this.playIcon,
            alpha: 0.6,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // منطقة التفاعل
        const buttonZone = this.add.zone(buttonX, buttonY, buttonSize, buttonSize);
        buttonZone.setInteractive({ cursor: 'pointer' });
        buttonZone.setDepth(105);
        
        // تأثيرات التفاعل
        buttonZone.on('pointerover', () => {
            if (!this.isSpinning) {
                this.buttonCircle.clear();
                this.buttonCircle.fillStyle(0xd4af37);
                this.buttonCircle.lineStyle(3, 0x8b6914);
                this.buttonCircle.fillCircle(buttonX, buttonY, buttonSize / 2);
                this.buttonCircle.strokeCircle(buttonX, buttonY, buttonSize / 2);
                
                // تسريع التوهج عند الهوفر
                this.glowTween.timeScale = 2;
            }
        });

        buttonZone.on('pointerout', () => {
            if (!this.isSpinning) {
                this.buttonCircle.clear();
                this.buttonCircle.fillStyle(0xc49b41);
                this.buttonCircle.lineStyle(3, 0x8b6914);
                this.buttonCircle.fillCircle(buttonX, buttonY, buttonSize / 2);
                this.buttonCircle.strokeCircle(buttonX, buttonY, buttonSize / 2);
                
                // إعادة سرعة التوهج الطبيعية
                this.glowTween.timeScale = 1;
            }
        });

        buttonZone.on('pointerdown', () => {
            if (!this.isSpinning) {
                // تشغيل صوت النقر
                if (this.sounds.click) {
                    this.sounds.click();
                }
                
                // إيقاف التوهج أثناء الدوران
                this.glowTween.pause();
                this.playIcon.setAlpha(1);
                this.spinWheel(width, height);
            }
        });
    }



    spinWheel(width, height) {
        if (this.isSpinning || this.prizes.length === 0) return;

        this.isSpinning = true;

        // تهيئة الصوت إذا لم يكن مهيئاً
        if (!this.audioInitialized) {
            this.createSynthesizedSounds();
            this.audioInitialized = true;
        }

        // مدة الدوران الإجمالية (10 ثواني مع تنويع بسيط)
        const spinDuration = Phaser.Math.Between(9500, 10500); // حوالي 10 ثواني

        // 🎯 نظام اختيار آمن ومتزامن - يمنع التضارب من الأساس
        let selectedPrize;
        
        // التحقق الفوري من الجوائز المتاحة في نفس لحظة الاختيار
        const currentAvailablePrizes = gameManager.getAvailablePrizes();
        
        // ✅ حماية مطلقة: إذا انتهت جميع الجوائز = 100% حاول في وقت لاحق
        if (currentAvailablePrizes.length === 0) {
            // جميع الجوائز انتهت
            selectedPrize = "حاول في وقت لاحق ⏰";
        } else {
            // خوارزمية الاختيار الذكي المتطورة (مع ضمان التزامن)
            const { tryLaterChance, shouldUseLuck } = gameManager.calculateIntelligentProbabilities();
            
            // اتخاذ القرار الذكي
            const random = Math.random();
            if (random < tryLaterChance) {
                selectedPrize = "حاول في وقت لاحق ⏰";
            } else {
                // 🔒 اختيار آمن: الاختيار من الجوائز المؤكدة المتاحة فقط
                selectedPrize = gameManager.selectSafeAvailablePrize(currentAvailablePrizes);
                if (!selectedPrize) {
                    // إذا فشل الاختيار الآمن، ارجع لـ "حاول في وقت لاحق"
                    // فشل الاختيار الآمن
                    selectedPrize = "حاول في وقت لاحق ⏰";
                }
            }
        }

        // حساب زاوية التوقف الذكي
        let prizeIndex;
        let targetAngle;
        
        if (selectedPrize === "حاول في وقت لاحق ⏰") {
            // إذا كانت رسالة خاصة، ابحث عن موقعها في العجلة
            prizeIndex = this.allPrizes.indexOf(selectedPrize);
            if (prizeIndex === -1) {
                // إذا لم توجد، اختر موقعاً عشوائياً
                prizeIndex = Math.floor(Math.random() * this.allPrizes.length);
            }
        } else {
            // إذا كانت جائزة حقيقية، احسب موقعها الصحيح
            prizeIndex = this.allPrizes.indexOf(selectedPrize);
            // إذا لم توجد، اختر من المتاح كبديل
            if (prizeIndex === -1 && availablePrizes.length > 0) {
                const fallbackPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
                prizeIndex = this.allPrizes.indexOf(fallbackPrize);
                selectedPrize = fallbackPrize;
            }
        }
        
        // حساب الزاوية المستهدفة
        const baseSectorAngle = (prizeIndex * this.sectorAngle);
        const centerSectorAngle = baseSectorAngle + (this.sectorAngle / 2);
        targetAngle = 360 - centerSectorAngle;

        // عدد اللفات الكاملة (3-6) لواقعية أكبر
        const rounds = Phaser.Math.Between(3, 6);
        const finalAngle = (rounds * 360) + targetAngle;

        // نظام صوت ديناميكي متزامن مع العجلة
        this.startDynamicWheelSounds(spinDuration, rounds);

        // تأثير بصري أثناء الدوران
        const spinningIndicator = this.add.text(width / 2, height / 2 + 450, 'جاري السحب...', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px', // حجم مناسب للدقة HD
            color: gameManager.colors.primary,
            alpha: 0.8
        }).setOrigin(0.5);

        // تأثير وميض يتباطأ مع العجلة
        const indicatorTween = this.tweens.add({
            targets: spinningIndicator,
            alpha: 0.3,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // تحديث فترات الوميض نسبةً للمدة الفعلية
        this.time.delayedCall(spinDuration * 0.33, () => {
            indicatorTween.updateTo('duration', 600);
        });

        this.time.delayedCall(spinDuration * 0.66, () => {
            indicatorTween.updateTo('duration', 1000);
        });

        this.time.delayedCall(spinDuration * 0.93, () => {
            indicatorTween.stop();
            spinningIndicator.setAlpha(0.8);
        });

        // حركة طبيعية: بداية سريعة ثم تباطؤ تدريجي (Cubic easing يعطي إحساسًا جيدًا)
        this.tweens.add({
            targets: this.wheel,
            angle: finalAngle,
            duration: spinDuration,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                // تحديث نص المؤشر حسب التقدم
                const progress = tween.progress;
                if (progress < 0.3) {
                    spinningIndicator.setText('دوران سريع...');
                } else if (progress < 0.7) {
                    spinningIndicator.setText('يبطئ...');
                } else if (progress < 0.95) {
                    spinningIndicator.setText('يتوقف...');
                } else {
                    spinningIndicator.setText('توقف!');
                }
            },
            onComplete: () => {
                // تشغيل صوت تيك نهائي قوي عند التوقف على الجائزة
                if (this.sounds.tick) {
                    this.sounds.tick(2.0);
                    // تيك إضافي للتأكيد
                    this.time.delayedCall(200, () => {
                        if (this.sounds.tick) {
                            this.sounds.tick(1.5);
                        }
                    });
                }

                // تشغيل صوت التوقف
                this.time.delayedCall(300, () => {
                    if (this.sounds.stop) {
                        this.sounds.stop();
                    }
                });

                // توقف نهائي
                this.time.delayedCall(500, () => {
                    this.isSpinning = false;

                    // إخفاء مؤشر الدوران
                    spinningIndicator.destroy();

                    // إعادة تشغيل التوهج
                    if (this.glowTween) {
                        this.glowTween.resume();
                    }

                    // إظهار النتيجة بعد توقف واضح
                    this.time.delayedCall(1000, () => {
                        if (selectedPrize === "حاول في وقت لاحق ⏰") {
                            // إظهار رسالة "حاول في وقت لاحق"
                            this.showTryLaterMessageWithClickToContinue();
                        } else {
                            // 🔒 الجائزة مؤكدة ومتاحة (تم اختيارها بالنظام الآمن)
                            const consumed = gameManager.consumePrize(selectedPrize);
                            if (consumed) {
                                // تشغيل صوت الفوز
                                if (this.sounds.win) {
                                    this.sounds.win();
                                }
                                this.showWinMessageWithClickToContinue(selectedPrize);
                            } else {
                                // 🚨 هذا لا يجب أن يحدث أبداً مع النظام الجديد!
                                console.error('🚨 خطأ مستحيل: فشل استهلاك جائزة آمنة!', selectedPrize);
                                // عرض رسالة خطأ للمطور
                                alert('خطأ نظام! اتصل بالدعم التقني');
                            }
                        }
                    });
                });
            }
        });
    }

    showWinMessage(prize) {
        const { width, height } = this.cameras.main;
        
        // إخفاء الزر أثناء عرض النتيجة
        if (this.buttonCircle) this.buttonCircle.setVisible(false);
        if (this.playIcon) this.playIcon.setVisible(false);
        
        // خلفية شبه شفافة مع تأثير ضبابي
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setDepth(200);
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 165, height / 2 - 120, 330, 240, 20);
        messageShadow.setDepth(201);
        
        // صندوق الرسالة مع تدرج
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(4, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 170, height / 2 - 125, 340, 250, 20);
        messageBox.strokeRoundedRect(width / 2 - 170, height / 2 - 125, 340, 250, 20);
        messageBox.setDepth(202);

        // حدود داخلية ذهبية
        const innerBorder = this.add.graphics();
        innerBorder.lineStyle(2, 0xd4af37, 0.8);
        innerBorder.strokeRoundedRect(width / 2 - 155, height / 2 - 110, 310, 220, 15);
        innerBorder.setDepth(203);
        
        // نص التهنئة مع تأثيرات
        const congratsText = this.add.text(width / 2, height / 2 - 80, '🎉 مبروك! 🎉', {
            fontFamily: 'Cairo, Arial',
            fontSize: '36px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: 'rgba(0,0,0,0.3)',
                blur: 5,
                fill: true
            }
        }).setOrigin(0.5).setDepth(204);

        // تأثير توهج للنص
        this.tweens.add({
            targets: congratsText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.add.text(width / 2, height / 2 - 20, 'لقد فزت بـ', {
            fontFamily: 'Cairo, Arial',
            fontSize: '22px',
            fontWeight: '500',
            color: gameManager.colors.text,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: 'rgba(0,0,0,0.2)',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5).setDepth(205);
        
        const prizeText = this.add.text(width / 2, height / 2 + 20, prize, {
            fontFamily: 'Cairo, Arial',
            fontSize: '30px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 1,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: 'rgba(0,0,0,0.4)',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5).setDepth(206);

        // تأثير نبضة للجائزة
        this.tweens.add({
            targets: prizeText,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Power2.easeInOut'
        });
        
        this.add.text(width / 2, height / 2 + 80, 'اتجه للكاشير لاستلام جائزتك', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: '400',
            color: gameManager.colors.text,
            align: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setDepth(207);

        // تأثير الاحتفال المحسن
        this.createEnhancedCelebrationEffect(width, height);
    }

    // 🔄 دالة الفوز مع النقر للمتابعة
    showWinMessageWithClickToContinue(prize) {
        const { width, height } = this.cameras.main;
        
        // إخفاء الزر أثناء عرض النتيجة
        if (this.buttonCircle) this.buttonCircle.setVisible(false);
        if (this.playIcon) this.playIcon.setVisible(false);
        
        // خلفية شبه شفافة مع تأثير ضبابي
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive()
            .setDepth(200); // عمق أعلى من الزر
        
        // ظل الصندوق (مناسب للدقة HD)
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        const winBoxW = 1400;  // عرض أكبر
        const winBoxH = 800;   // ارتفاع أكبر
        messageShadow.fillRoundedRect(width / 2 - winBoxW / 2 - 15, height / 2 - winBoxH / 2 - 15, winBoxW + 30, winBoxH + 30, 30);
        messageShadow.setDepth(201);
        
        // صندوق الرسالة مع تدرج
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - winBoxW / 2, height / 2 - winBoxH / 2, winBoxW, winBoxH, 30);
        messageBox.strokeRoundedRect(width / 2 - winBoxW / 2, height / 2 - winBoxH / 2, winBoxW, winBoxH, 30);
        messageBox.setDepth(202);

        // حدود داخلية ذهبية
        const innerBorder = this.add.graphics();
        innerBorder.lineStyle(6, 0xd4af37, 0.8); // خط أثخن
        innerBorder.strokeRoundedRect(width / 2 - winBoxW / 2 + 20, height / 2 - winBoxH / 2 + 20, winBoxW - 40, winBoxH - 40, 25);
        innerBorder.setDepth(203);
        
        // نص التهنئة مع تأثيرات (موضع أعلى داخل الصندوق الكبير)
        const congratsText = this.add.text(width / 2, height / 2 - 250, '🎉 مبروك! 🎉', {
            fontFamily: 'Cairo, Arial',
            fontSize: '108px', // تكبير للدقة 4K
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 6, // تكبير السمك
            shadow: {
                offsetX: 9,
                offsetY: 9,
                color: 'rgba(0,0,0,0.3)',
                blur: 15,
                fill: true
            }
        }).setOrigin(0.5).setDepth(204);

        // تأثير توهج للنص
        this.tweens.add({
            targets: congratsText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.add.text(width / 2, height / 2 - 80, 'لقد فزت بـ', {
            fontFamily: 'Cairo, Arial',
            fontSize: '66px', // تكبير للدقة 4K
            fontWeight: '500',
            color: gameManager.colors.text,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: 'rgba(0,0,0,0.2)',
                blur: 6,
                fill: true
            }
        }).setOrigin(0.5).setDepth(205);
        
        const prizeText = this.add.text(width / 2, height / 2, prize, {
            fontFamily: 'Cairo, Arabic',
            fontSize: '90px', // تكبير للدقة 4K
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 3, // تكبير السمك
            shadow: {
                offsetX: 6,
                offsetY: 6,
                color: 'rgba(0,0,0,0.4)',
                blur: 12,
                fill: true
            }
        }).setOrigin(0.5).setDepth(206);

        // تأثير نبضة للجائزة
        this.tweens.add({
            targets: prizeText,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Power2.easeInOut'
        });
        
        this.add.text(width / 2, height / 2 + 120, 'اتجه للكاشير لاستلام جائزتك', {
            fontFamily: 'Cairo, Arial',
            fontSize: '54px', // تكبير للدقة 4K
            fontWeight: '400',
            color: gameManager.colors.text,
            align: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: { x: 45, y: 24 } // تكبير الحشو
        }).setOrigin(0.5).setDepth(207);

        // 👆 رسالة النقر للمتابعة
        const clickToContinueText = this.add.text(width / 2, height / 2 + 250, '👆 اضغط في أي مكان للمتابعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '48px', // تكبير للدقة 4K
            fontWeight: '400',
            color: gameManager.colors.primary,
            backgroundColor: 'rgba(196, 155, 65, 0.2)',
            padding: { x: 60, y: 30 } // تكبير الحشو
        }).setOrigin(0.5).setDepth(208);

        // تأثير وميض لرسالة النقر
        this.tweens.add({
            targets: clickToContinueText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // إضافة مستمع النقر
        overlay.on('pointerdown', () => {
            this.scene.restart();
        });

        // تأثير الاحتفال المحسن
        this.createEnhancedCelebrationEffect(width, height);
    }





    // ⏰ دالة حاول لاحقاً مع النقر للمتابعة
    showTryLaterMessageWithClickToContinue() {
        const { width, height } = this.cameras.main;
        
        // إخفاء الزر أثناء عرض النتيجة
        if (this.buttonCircle) this.buttonCircle.setVisible(false);
        if (this.playIcon) this.playIcon.setVisible(false);
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive()
            .setDepth(200);
        
    // ظل الصندوق (مكبر ليتناسب مع النص الكبير في 4K)
    const messageShadow = this.add.graphics();
    messageShadow.fillStyle(0x000000, 0.4);
    // صندوق أكبر: العرض والارتفاع مرفوعان ليتناسبا مع الخط الكبير
    const tryLaterBoxW = 400;
    const tryLaterBoxH = 480;
    messageShadow.fillRoundedRect(width / 2 - tryLaterBoxW / 2, height / 2 - tryLaterBoxH / 2, tryLaterBoxW, tryLaterBoxH, 30);
    messageShadow.setDepth(201);

    // صندوق الرسالة
    const messageBox = this.add.graphics();
    messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
    messageBox.lineStyle(6, 0xc49b41);
    messageBox.fillRoundedRect(width / 2 - tryLaterBoxW / 2, height / 2 - tryLaterBoxH / 2, tryLaterBoxW, tryLaterBoxH, 30);
    messageBox.strokeRoundedRect(width / 2 - tryLaterBoxW / 2, height / 2 - tryLaterBoxH / 2, tryLaterBoxW, tryLaterBoxH, 30);
    messageBox.setDepth(202);

        // نص "حاول في وقت لاحق"
        // وضع النص داخل الصندوق الأكبر (موضع أعلى قليلاً ليظهر متناغمًا)
        const messageText = this.add.text(width / 2, height / 2 - 60, '⏰ حاول في وقت لاحق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '84px', // تكبير للدقة 4K
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 6 // تكبير السمك
        }).setOrigin(0.5).setDepth(203);



        // 👆 رسالة النقر للمتابعة
        const clickToContinueText = this.add.text(width / 2, height / 2 + 150, '👆 اضغط في أي مكان للمتابعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '48px', // تكبير للدقة 4K
            fontWeight: '400',
            color: gameManager.colors.primary,
            backgroundColor: 'rgba(196, 155, 65, 0.2)',
            padding: { x: 60, y: 30 } // تكبير الحشو
        }).setOrigin(0.5).setDepth(205);

        // تأثير نبضة للنص الرئيسي
        this.tweens.add({
            targets: messageText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1200,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });

        // تأثير وميض لرسالة النقر
        this.tweens.add({
            targets: clickToContinueText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // إضافة مستمع النقر
        overlay.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    showTryLaterMessage() {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        // صندوق أكبر ليتناسب مع نص أكبر
        const tlBoxW = 900;
        const tlBoxH = 360;
        messageShadow.fillRoundedRect(width / 2 - tlBoxW / 2, height / 2 - tlBoxH / 2, tlBoxW, tlBoxH, 25);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - tlBoxW / 2, height / 2 - tlBoxH / 2, tlBoxW, tlBoxH, 25);
        messageBox.strokeRoundedRect(width / 2 - tlBoxW / 2, height / 2 - tlBoxH / 2, tlBoxW, tlBoxH, 25);

        // نص "حاول في وقت لاحق"
        const messageText = this.add.text(width / 2, height / 2 - 40, '⏰ حاول في وقت لاحق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);



        // تأثير نبضة للنص
        this.tweens.add({
            targets: messageText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1200,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });
    }

    showTryAgainMessage() {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 165, height / 2 - 80, 330, 160, 20);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);

        // نص عام دون كشف السبب
        const messageText = this.add.text(width / 2, height / 2 - 20, '😔 حظ أوفر المرة القادمة!', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 25, 'جرب مرة أخرى للفوز بجائزة رائعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: '500',
            color: gameManager.colors.text
        }).setOrigin(0.5);

        // تأثير نبضة للنص
        this.tweens.add({
            targets: messageText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createEnhancedCelebrationEffect(width, height) {
        // نجوم ذهبية متفجرة
        for (let i = 0; i < 25; i++) {
            const star = this.add.graphics();
            const starSize = 4 + Math.random() * 8;
            star.fillStyle(0xd4af37, 0.9);
            star.beginPath();
            star.moveTo(0, -starSize);
            star.lineTo(starSize * 0.3, -starSize * 0.3);
            star.lineTo(starSize, 0);
            star.lineTo(starSize * 0.3, starSize * 0.3);
            star.lineTo(0, starSize);
            star.lineTo(-starSize * 0.3, starSize * 0.3);
            star.lineTo(-starSize, 0);
            star.lineTo(-starSize * 0.3, -starSize * 0.3);
            star.closePath();
            star.fillPath();
            
            star.setPosition(width / 2, height / 2);
            
            const angle = (Math.PI * 2 * i) / 25;
            const distance = 150 + Math.random() * 200;
            
            this.tweens.add({
                targets: star,
                x: width / 2 + Math.cos(angle) * distance,
                y: height / 2 + Math.sin(angle) * distance,
                rotation: Math.PI * 4,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 2000 + Math.random() * 1000,
                ease: 'Power2.easeOut',
                onComplete: () => star.destroy()
            });
        }

        // كونفيتي ملون
        for (let i = 0; i < 30; i++) {
            const confetti = this.add.graphics();
            const confettiColors = [0xc49b41, 0xd4af37, 0xe8dcc0, 0xf5f1e6];
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            confetti.fillStyle(color);
            confetti.fillRect(0, 0, 8, 4);
            
            confetti.setPosition(
                width / 2 + (Math.random() - 0.5) * 100,
                height / 2 - 50
            );
            
            this.tweens.add({
                targets: confetti,
                x: confetti.x + (Math.random() - 0.5) * 300,
                y: confetti.y + Math.random() * 400,
                rotation: Math.PI * 4,
                alpha: 0,
                duration: 3000,
                ease: 'Power2.easeOut',
                onComplete: () => confetti.destroy()
            });
        }

        // دوائر متوسعة
        for (let i = 0; i < 5; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(3, 0xd4af37, 0.8);
            circle.strokeCircle(width / 2, height / 2, 10);
            
            this.tweens.add({
                targets: circle,
                scaleX: 15,
                scaleY: 15,
                alpha: 0,
                duration: 2000,
                ease: 'Power2.easeOut',
                delay: i * 300,
                onComplete: () => circle.destroy()
            });
        }
    }

    createAmbientLighting(width, height) {
        // إضاءة محيطة ناعمة
        const ambientLight = this.add.graphics();
        const centerX = width / 2;
        const centerY = height / 2;
        
        // دوائر إضاءة متدرجة
        for (let i = 0; i < 8; i++) {
            const radius = 100 + (i * 80);
            const alpha = 0.05 - (i * 0.005);
            ambientLight.fillStyle(0xffffff, alpha);
            ambientLight.fillCircle(centerX, centerY, radius);
        }
        
        // تأثيرات ضوء ديناميكي
        this.tweens.add({
            targets: ambientLight,
            alpha: 0.8,
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // بقع ضوء إضافية في الزوايا
        const spotLights = [
            { x: width * 0.15, y: height * 0.15 },
            { x: width * 0.85, y: height * 0.15 },
            { x: width * 0.15, y: height * 0.85 },
            { x: width * 0.85, y: height * 0.85 }
        ];
        
        spotLights.forEach((spot, index) => {
            const spotlight = this.add.graphics();
            for (let i = 0; i < 5; i++) {
                const radius = 30 + (i * 20);
                const alpha = 0.08 - (i * 0.01);
                spotlight.fillStyle(0xd4af37, alpha);
                spotlight.fillCircle(spot.x, spot.y, radius);
            }
            
            this.tweens.add({
                targets: spotlight,
                alpha: 0.5,
                duration: 3000 + (index * 500),
                yoyo: true,
                repeat: -1,
                ease: 'Power1.easeInOut'
            });
        });
    }

    createEnhancedSoundEffects() {
        // إضافة أصوات متطورة للعبة (اختياري)
        // يمكن تفعيل الأصوات لاحقاً عند الحاجة
        const soundConfig = {
            mute: false,
            volume: 0.3,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        };
        
        return soundConfig;
    }

    initializeAudioOnFirstClick() {
        const initAudio = () => {
            if (!this.audioInitialized) {
                this.createSynthesizedSounds();
                this.startBackgroundMusic();
                this.audioInitialized = true;
                
                // إزالة المستمع بعد التهيئة
                this.input.off('pointerdown', initAudio);
                document.removeEventListener('click', initAudio);
                document.removeEventListener('touchstart', initAudio);
            }
        };

        // إضافة مستمعين لأول تفاعل
        this.input.on('pointerdown', initAudio);
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    }

    createSynthesizedSounds() {
        try {
            // إنشاء الأصوات باستخدام Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // تشغيل AudioContext إذا كان متوقفاً
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        
            // صوت دوران العجلة
            this.sounds.wheelSpin = this.createWheelSpinSound(this.audioContext);
            
            // صوت النقر
            this.sounds.click = this.createClickSound(this.audioContext);
            
            // صوت الفوز
            this.sounds.win = this.createWinSound(this.audioContext);
            
            // صوت التوقف
            this.sounds.stop = this.createStopSound(this.audioContext);
            
            // صوت تيك للمرور على الجوائز
            this.sounds.tick = this.createTickSound(this.audioContext);
        } catch (error) {
            this.soundEnabled = false;
        }
    }

    createWheelSpinSound(audioContext) {
        return (speedMultiplier = 1) => {
            if (!this.soundEnabled) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sawtooth';
            
            // تردد متغير حسب السرعة
            const baseFreq = 150 * speedMultiplier;
            const endFreq = 80 * speedMultiplier;
            
            oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + 0.08);
            
            // صوت أخف مع تباطؤ السرعة
            const volume = 0.08 * speedMultiplier;
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
        };
    }

    createClickSound(audioContext) {
        return () => {
            if (!this.soundEnabled) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        };
    }

    createWinSound(audioContext) {
        return () => {
            if (!this.soundEnabled) return;
            
            // سلسلة نغمات للفوز
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                
                const startTime = audioContext.currentTime + (index * 0.2);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, startTime + 0.4);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.4);
            });
        };
    }

    createStopSound(audioContext) {
        return () => {
            if (!this.soundEnabled) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        };
    }

    createTickSound(audioContext) {
        return (intensity = 1) => {
            if (!this.soundEnabled) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600 * intensity, audioContext.currentTime);
            
            const volume = 0.04 * intensity;
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        };
    }

    startBackgroundMusic() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const playAmbientTone = () => {
            if (!this.soundEnabled || !this.audioContext) return;
            
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator1.type = 'sine';
            oscillator2.type = 'sine';
            oscillator1.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
            oscillator2.frequency.setValueAtTime(329.63, this.audioContext.currentTime); // E4
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.03, this.audioContext.currentTime + 2);
            gainNode.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 8);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 10);
            
            oscillator1.start(this.audioContext.currentTime);
            oscillator2.start(this.audioContext.currentTime);
            oscillator1.stop(this.audioContext.currentTime + 10);
            oscillator2.stop(this.audioContext.currentTime + 10);
        };
        
        // تشغيل النغمة كل 15 ثانية
        playAmbientTone();
        this.backgroundMusicInterval = setInterval(playAmbientTone, 15000);
    }

    createSoundToggle(width, height) {
        // زر تبديل الصوت في الزاوية العلوية اليمنى
        const soundButton = this.add.graphics();
        const buttonX = width - 60; // تعديل الموضع للدقة HD
        const buttonY = 50; // تعديل الموضع للدقة HD
        const buttonSize = 40; // حجم مناسب للدقة HD
        
        // رسم الزر
        const drawSoundButton = (enabled) => {
            soundButton.clear();
            soundButton.fillStyle(enabled ? 0xd4af37 : 0x888888, 0.8);
            soundButton.lineStyle(2, 0x6d5011);
            soundButton.fillCircle(buttonX, buttonY, buttonSize / 2);
            soundButton.strokeCircle(buttonX, buttonY, buttonSize / 2);
        };
        
        drawSoundButton(this.soundEnabled);
        
        // أيقونة الصوت
        const soundIcon = this.add.text(buttonX, buttonY, this.soundEnabled ? '🔊' : '🔇', {
            fontSize: '20px' // حجم الأيقونة للدقة HD
        }).setOrigin(0.5);
        
        // منطقة التفاعل
        const soundZone = this.add.zone(buttonX, buttonY, buttonSize, buttonSize);
        soundZone.setInteractive({ cursor: 'pointer' });
        
        soundZone.on('pointerdown', () => {
            this.soundEnabled = !this.soundEnabled;
            drawSoundButton(this.soundEnabled);
            soundIcon.setText(this.soundEnabled ? '🔊' : '🔇');
            
            // تهيئة الصوت إذا لم يكن مهيئاً
            if (!this.audioInitialized) {
                this.createSynthesizedSounds();
                this.audioInitialized = true;
            }
            
            if (this.soundEnabled) {
                this.startBackgroundMusic();
            } else if (this.backgroundMusicInterval) {
                clearInterval(this.backgroundMusicInterval);
            }
            
            // تشغيل صوت النقر
            if (this.sounds.click) {
                this.sounds.click();
            }
        });
    }

    startDynamicWheelSounds(spinDuration, rounds) {
        if (!this.sounds.wheelSpin) return;

        // حساب متغيرات ديناميكية بناءً على العوامل الخارجية
        const totalPrizes = this.prizes.length; // عدد الجوائز
        const totalRotations = rounds * 360; // إجمالي الدوران بالدرجات
        
        // حساب عدد التيك المتوقع (كل جائزة = تيك واحد تقريباً في اللفة)
        const expectedTicks = Math.ceil((totalRotations / 360) * totalPrizes);
        
        // توزيع الأصوات على مدة الدوران
        const baseTickInterval = spinDuration / expectedTicks;
        
        // بداية سريعة، تباطؤ تدريجي
        let currentTickInterval = baseTickInterval * 0.3; // بداية أسرع من المتوسط
        let soundSpeedMultiplier = 2.5; // سرعة الصوت في البداية
        let tickCount = 0;
        let currentTimeout;

        const playAdaptiveSound = () => {
            if (!this.isSpinning || tickCount >= expectedTicks) return;

            // نسبة التقدم في الدوران (0 إلى 1)
            const progress = tickCount / expectedTicks;
            
            // تشغيل صوت الدوران الأساسي
            if (this.sounds.wheelSpin) {
                this.sounds.wheelSpin(soundSpeedMultiplier);
            }

            // تشغيل تيك بناءً على تقسيم دقيق للقطاعات
            const shouldPlayTick = this.shouldPlayTickAtPosition(tickCount, totalPrizes, rounds);
            if (shouldPlayTick && this.sounds.tick) {
                // قوة التيك تعتمد على السرعة الحالية
                const tickIntensity = Math.max(soundSpeedMultiplier * 0.6, 0.4);
                this.sounds.tick(tickIntensity);
            }

            // تحديث المتغيرات للمرة القادمة
            tickCount++;
            
            // تباطؤ تدريجي واقعي (منحنى أسي)
            const decayRate = 1 + (progress * 0.8); // تباطؤ أقوى مع التقدم
            currentTickInterval = Math.min(currentTickInterval * decayRate, baseTickInterval * 3);
            soundSpeedMultiplier = Math.max(2.5 * (1 - progress * 0.85), 0.3);

            // جدولة الصوت التالي
            currentTimeout = setTimeout(playAdaptiveSound, currentTickInterval);
        };

        // بدء النظام الصوتي
        playAdaptiveSound();

        // إيقاف النظام عند انتهاء الدوران
        this.time.delayedCall(spinDuration + 100, () => {
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }
        });
    }

    shouldPlayTickAtPosition(tickIndex, totalPrizes, rounds) {
        // حساب دقيق: هل نمر على حافة جائزة في هذه اللحظة؟
        const totalSectors = rounds * totalPrizes;
        const sectorsPerPrize = totalSectors / totalPrizes;
        
        // تشغيل تيك عند المرور على حواف الجوائز + بعض العشوائية
        const isOnPrizeBoundary = (tickIndex % sectorsPerPrize) < 0.8;
        const randomChance = Math.random() < 0.75; // 75% احتمالية
        
        return isOnPrizeBoundary || randomChance;
    }

    // 🖼️ دالة إضافة الصور للجوائز (للاستخدام المستقبلي)
    addPrizeImage(x, y, prizeName, wheelRadius) {
        // خريطة أسماء الصور للهدايا - محدثة بالأسماء الجديدة
        const imageMap = {
            'خصم 5% 💰': 'offer5',
            'فرى دليفرى 🛵': 'دليفري',
            'موهيتو فرى 🍹': 'موهيتو',
            'خصم 15% 💸': 'offer15',
            'كومبو فرى 🍟🧃': 'كومبو فري',
            'وافل شكولاته 🥞': 'وافل شوكلاته',
            'اورجينال برجر 🍔': 'اورجينال',
            'تشيكن لافا 🍔': 'تشكن لافا',
            'حاول في وقت لاحق ⏰': 'حاول وقت لاحق'
        };

        const fileName = imageMap[prizeName];
        if (fileName) {
            // التحقق من وجود الصورة المحملة
            if (this.textures.exists(fileName)) {
                const prizeImage = this.add.image(x, y, fileName);
                
                // التحقق من نوع الصورة لضبط النسبة الصحيحة - مناسبة للدقة HD
                if (fileName === 'موهيتو') {
                    // للموهيتو: نحافظ على النسبة الطبيعية للكوب (أطول من العرض)
                    const imageWidth = Math.max(65, wheelRadius * 0.35); // حجم مناسب للدقة HD
                    const imageHeight = Math.max(90, wheelRadius * 0.45); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageWidth, imageHeight);
                } else if (fileName === 'دليفري') {
                    // للدليفري: أعرض من الطول بكثير لأن الصورة الأصلية بالعرض
                    const imageWidth = Math.max(110, wheelRadius * 0.48); // حجم مناسب للدقة HD
                    const imageHeight = Math.max(65, wheelRadius * 0.28); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageWidth, imageHeight);
                } else if (fileName === 'offer15') {
                    // لخصم 15%: مربع مناسب لملء الخانة
                    const imageSize = Math.max(85, wheelRadius * 0.38); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageSize, imageSize);
                } else if (fileName === 'offer5') {
                    // لخصم 5%: مربع مناسب لملء الخانة
                    const imageSize = Math.max(85, wheelRadius * 0.38); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageSize, imageSize);
                } else if (fileName === 'اورجينال') {
                    // للأورجينال برجر: أعرض من الطول ليبدو طبيعياً
                    const imageWidth = Math.max(95, wheelRadius * 0.42); // حجم مناسب للدقة HD
                    const imageHeight = Math.max(75, wheelRadius * 0.32); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageWidth, imageHeight);
                } else if (fileName === 'تشكن لافا') {
                    // لتشكن لافا: أعرض من الطول بكثير ليبدو كساندوتش مسطح
                    const imageWidth = Math.max(110, wheelRadius * 0.48); // حجم مناسب للدقة HD
                    const imageHeight = Math.max(65, wheelRadius * 0.28); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageWidth, imageHeight);
                } else if (fileName === 'كومبو فري') {
                    // للكومبو: حجم متوسط مناسب
                    const imageSize = Math.max(85, wheelRadius * 0.36); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageSize, imageSize);
                } else if (fileName === 'حاول وقت لاحق') {
                    // لحاول وقت لاحق: صورة صغيرة داخل القطاع الأسود
                    const imageWidth = Math.max(40, wheelRadius * 0.20); // حجم مناسب للدقة HD
                    const imageHeight = Math.max(60, wheelRadius * 0.30); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageWidth, imageHeight);
                } else {
                    // للصور الأخرى: مربع عادي
                    const imageSize = Math.max(75, wheelRadius * 0.32); // حجم مناسب للدقة HD
                    prizeImage.setDisplaySize(imageSize, imageSize);
                }
                
                prizeImage.setAlpha(1.0); // شفافية كاملة للوضوح
                // لا نضيف الصورة هنا - ستُضاف في الدالة الرئيسية
                return prizeImage;
            } else {
                console.log(`⚠️ الصورة ${fileName} غير محملة للجائزة: ${prizeName}`);
                return null;
            }
        }
        
        return null;
    }
}

// ===== إعداد وتشغيل اللعبة =====
const gameManager = new GameManager();

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#0D5016', // أخضر كازينو داكن
    parent: 'gameContainer',
    scene: [GameScene],
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
    audio: {
        disableWebAudio: false // تمكين Web Audio للأصوات
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true
    }
};

// تشغيل اللعبة عند تحميل الإعدادات
gameManager.loadSettings().then(success => {
    if (success) {
        const game = new Phaser.Game(config);
        window.game = game; // حفظ مرجع للعبة
        document.querySelector('.loading').style.display = 'none';
    } else {
        document.querySelector('.loading').innerHTML = 'خطأ في تحميل اللعبة - تحقق من ملف settings.json';
        console.error('فشل في تحميل إعدادات اللعبة');
    }
}).catch(error => {
    console.error('خطأ في تشغيل اللعبة:', error);
    document.querySelector('.loading').innerHTML = 'خطأ في تشغيل اللعبة';
});

// تعديل حجم اللعبة عند تغيير حجم النافذة
window.addEventListener('resize', () => {
    if (window.game) {
        window.game.scale.refresh();
    }
});