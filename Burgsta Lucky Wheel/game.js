// ===== مدير إعدادات اللعبة وإدارة البيانات =====
window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});
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
        
        // إذا كان يوم جديد، قم بتصفير العد
        if (savedDate !== today) {
            localStorage.setItem('burgsta_date', today);
            localStorage.removeItem('burgsta_daily_limits');
        }

        // تحميل الحدود المحفوظة أو إنشاء جديدة
        const savedLimits = localStorage.getItem('burgsta_daily_limits');
        if (savedLimits) {
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
        
        if (totalDailyPrizes <= 5) {
            // مطعم صغير جداً - بخيل جداً لحماية الجوائز القليلة
            generosityLevel = "بخيل جداً";
            baseGenerosity = 0.75; // 75% حاول لاحقاً في البداية
            scarcityMultiplier = 4.0;
            // تم تحديد النمط: بخيل جداً
        } else if (totalDailyPrizes <= 15) {
            // مطعم صغير - بخيل لحماية الميزانية
            generosityLevel = "بخيل";
            baseGenerosity = 0.60; // 60% حاول لاحقاً في البداية
            scarcityMultiplier = 3.0;
            // تم تحديد النمط: بخيل
        } else if (totalDailyPrizes <= 50) {
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
        if (generosityLevel === "بخيل جداً") {
            minChance = 0.65; maxChance = 0.95;
        } else if (generosityLevel === "بخيل") {
            minChance = 0.45; maxChance = 0.90;
        } else if (generosityLevel === "متوسط") {
            minChance = 0.25; maxChance = 0.80;
        } else if (generosityLevel === "كريم") {
            minChance = 0.15; maxChance = 0.70;
        } else {
            minChance = 0.05; maxChance = 0.60;
        }
        
        tryLaterChance = Math.min(Math.max(tryLaterChance, minChance), maxChance);

        // تم حساب الإحصائيات

        // قرار استخدام "حظ سعيد" بدلاً من جائزة حقيقية (أقل مع المطاعم الصغيرة)
        const luckChance = generosityLevel === "بخيل جداً" ? 0.02 : 
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
        // سيتم إنشاء الأصوات عند أول تفاعل للمستخدم
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

        // شعار المطعم في الأعلى مع تأثير إضاءة
        const restaurantName = this.add.text(width / 2, 80, 'BURGSTA', {
            fontFamily: 'Cairo, Arial',
            fontSize: '48px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: 'rgba(0,0,0,0.3)',
                blur: 5,
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
        
        // خلط الجوائز عشوائياً لتجنب التكرار المتوقع (خلط إضافي)
        let shuffledPrizes = this.shuffleArray([...this.originalPrizes]);
        shuffledPrizes = this.shuffleArray(shuffledPrizes); // خلط مزدوج للتأكد
        
        // إضافة "حاول في وقت لاحق" في موضع عشوائي (مع خلط إضافي)
        const positions = Array.from({length: shuffledPrizes.length + 1}, (_, i) => i);
        const shuffledPositions = this.shuffleArray(positions);
        const randomPosition = shuffledPositions[0];
        shuffledPrizes.splice(randomPosition, 0, "حاول في وقت لاحق ⏰");
        
        // خلط نهائي للتأكد من العشوائية الكاملة
        shuffledPrizes = this.shuffleArray(shuffledPrizes);
        
        // العجلة تعرض الجوائز مخلوطة عشوائياً
        this.allPrizes = shuffledPrizes;
        this.prizes = this.allPrizes;
        
        // تم تحميل الجوائز بنجاح وخلطها عشوائياً

        // إنشاء العجلة في المنتصف
        this.createWheel(width, height);
        
        // زر البدء تحت العجلة
        this.createPlayButton(width, height);
        
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
        // خلفية متدرجة أساسية
        const bgGradient = this.add.graphics();
        bgGradient.fillGradientStyle(0xf9f5e7, 0xf9f5e7, 0xe8dcc0, 0xd4c4a0, 1);
        bgGradient.fillRect(0, 0, width, height);

        // دوائر زخرفية ذهبية شفافة
        for (let i = 0; i < 8; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(2, 0xc49b41, 0.1);
            const x = (width / 9) * (i + 1);
            const y = height / 6 + Math.sin(i) * 50;
            const radius = 40 + Math.random() * 30;
            circle.strokeCircle(x, y, radius);
            
            // تأثير حركة لطيفة للدوائر
            this.tweens.add({
                targets: circle,
                y: y + Math.sin(i) * 20,
                duration: 3000 + i * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // دوائر زخرفية في الأسفل
        for (let i = 0; i < 6; i++) {
            const circle = this.add.graphics();
            circle.lineStyle(1, 0xd4af37, 0.08);
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
                ease: 'Sine.easeInOut'
            });
        }

        // خطوط زخرفية أنيقة
        const decorLines = this.add.graphics();
        decorLines.lineStyle(1, 0xc49b41, 0.3);
        
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
        for (let i = 0; i < 12; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(0xc49b41, 0.6);
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

    createWheel(width, height) {
        const centerX = width / 2;
        const centerY = height / 2 + 20; // نزل العجلة أكثر
        const radius = 180;
        
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
            const color = colors[i % colors.length];
            
            // رسم القطاع مع تدرج لوني - جميع الجوائز تبدو متشابهة
            const sector = this.add.graphics();
            // ألوان فاتحة مخلوطة عشوائياً لتجنب التكرار المتوقع
            const baseLighterColors = [0xe8dcc0, 0xf0e6d2, 0xd4c5a0, 0xc9b876, 0xf5f1e6, 0xede4d2];
            const lighterColors = this.shuffleArray([...baseLighterColors]);
            const lighterColor = lighterColors[i % lighterColors.length];
            
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
            
            // نص الجائزة - جميع النصوص تبدو متشابهة دون أي إشارة لحالة التوفر
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.65;
            const textX = Math.cos(textAngle) * textRadius;
            const textY = Math.sin(textAngle) * textRadius;
            
            const prizeText = this.add.text(textX, textY, this.prizes[i], {
                fontFamily: 'Cairo, Arial',
                fontSize: '14px',
                fontWeight: '700',
                color: color === 0xe8dcc0 ? '#5d4e37' : '#ffffff',
                align: 'center',
                wordWrap: { width: 70 },
                stroke: color === 0xe8dcc0 ? '#ffffff' : '#8b6914',
                strokeThickness: 1,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: 'rgba(0,0,0,0.5)',
                    blur: 2,
                    fill: true
                }
            }).setOrigin(0.5);
            
            this.wheel.add([sector, innerShadow, prizeText]);
        }

        // دائرة المركز مع تأثير ثلاثي الأبعاد
        const centerOuter = this.add.graphics();
        centerOuter.fillGradientStyle(0x8b6914, 0x8b6914, 0xc49b41, 0xd4af37, 0.9);
        centerOuter.lineStyle(2, 0x6d5011);
        centerOuter.fillCircle(0, 0, 12);
        centerOuter.strokeCircle(0, 0, 12);

        const centerInner = this.add.graphics();
        centerInner.fillStyle(0xc49b41);
        centerInner.fillCircle(0, 0, 8);

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
        // ظل المؤشر
        const pointerShadow = this.add.graphics();
        pointerShadow.fillStyle(0x000000, 0.3);
        pointerShadow.beginPath();
        pointerShadow.moveTo(centerX + 2, centerY - radius - 13);
        pointerShadow.lineTo(centerX - 10, centerY - radius + 10);
        pointerShadow.lineTo(centerX + 14, centerY - radius + 10);
        pointerShadow.closePath();
        pointerShadow.fillPath();

        // المؤشر الرئيسي مع تدرج
        const pointer = this.add.graphics();
        pointer.fillGradientStyle(0xd4af37, 0xc49b41, 0x8b6914, 0x6d5011, 1);
        pointer.lineStyle(2, 0x6d5011);
        pointer.beginPath();
        pointer.moveTo(centerX, centerY - radius - 15);
        pointer.lineTo(centerX - 12, centerY - radius + 8);
        pointer.lineTo(centerX + 12, centerY - radius + 8);
        pointer.closePath();
        pointer.fillPath();
        pointer.strokePath();

        // تأثير توهج للمؤشر
        const pointerGlow = this.add.graphics();
        pointerGlow.fillStyle(0xd4af37, 0.4);
        pointerGlow.beginPath();
        pointerGlow.moveTo(centerX, centerY - radius - 18);
        pointerGlow.lineTo(centerX - 15, centerY - radius + 5);
        pointerGlow.lineTo(centerX + 15, centerY - radius + 5);
        pointerGlow.closePath();
        pointerGlow.fillPath();
    }

    createPlayButton(width, height) {
        const buttonX = width / 2;
        const buttonY = height / 2 + 20; // نفس مكان العجلة الجديد
        const buttonSize = 60;
        
        // ظل الزر
        const buttonShadow = this.add.graphics();
        buttonShadow.fillStyle(0x000000, 0.2);
        buttonShadow.fillCircle(buttonX + 4, buttonY + 4, buttonSize / 2);

        // دائرة الزر مع تدرج ثلاثي الأبعاد
        this.buttonCircle = this.add.graphics();
        this.buttonCircle.fillGradientStyle(0xd4af37, 0xc49b41, 0x8b6914, 0x6d5011, 1);
        this.buttonCircle.lineStyle(4, 0x6d5011);
        this.buttonCircle.fillCircle(buttonX, buttonY, buttonSize / 2);
        this.buttonCircle.strokeCircle(buttonX, buttonY, buttonSize / 2);

        // حلقة توهج خارجية
        const buttonGlow = this.add.graphics();
        buttonGlow.lineStyle(3, 0xd4af37, 0.6);
        buttonGlow.strokeCircle(buttonX, buttonY, (buttonSize / 2) + 8);

        // رمز تشغيل مع ظل وتوهج
        const playIconShadow = this.add.graphics();
        playIconShadow.fillStyle(0x000000, 0.3);
        playIconShadow.beginPath();
        playIconShadow.moveTo(buttonX - 6, buttonY - 10);
        playIconShadow.lineTo(buttonX + 14, buttonY + 2);
        playIconShadow.lineTo(buttonX - 6, buttonY + 14);
        playIconShadow.closePath();
        playIconShadow.fillPath();

        this.playIcon = this.add.graphics();
        this.playIcon.fillStyle(0xffffff);
        this.playIcon.lineStyle(1, 0xe8dcc0);
        this.playIcon.beginPath();
        this.playIcon.moveTo(buttonX - 8, buttonY - 12);
        this.playIcon.lineTo(buttonX + 12, buttonY);
        this.playIcon.lineTo(buttonX - 8, buttonY + 12);
        this.playIcon.closePath();
        this.playIcon.fillPath();
        this.playIcon.strokePath();

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

        // مدة الدوران الإجمالية (عشوائية قليلًا لخلط الإحساس)
        const spinDuration = Phaser.Math.Between(4200, 5200);

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
            } else if (shouldUseLuck) {
                selectedPrize = "حظ سعيد مرة أخرى 🍀";
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
        
        if (selectedPrize === "حظ سعيد مرة أخرى 🍀" || selectedPrize === "حاول في وقت لاحق ⏰") {
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
        const spinningIndicator = this.add.text(width / 2, height / 2 + 150, 'جاري السحب...', {
            fontFamily: 'Cairo, Arial',
            fontSize: '20px',
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
                        if (selectedPrize === "حظ سعيد مرة أخرى 🍀") {
                            // إظهار رسالة "حظ سعيد" دون استهلاك جائزة
                            this.showLuckMessageWithClickToContinue();
                        } else if (selectedPrize === "حاول في وقت لاحق ⏰") {
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
        
        // خلفية شبه شفافة مع تأثير ضبابي
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 145, 400, 300, 25);
        
        // صندوق الرسالة مع تدرج
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 25);

        // حدود داخلية ذهبية
        const innerBorder = this.add.graphics();
        innerBorder.lineStyle(2, 0xd4af37, 0.8);
        innerBorder.strokeRoundedRect(width / 2 - 185, height / 2 - 135, 370, 270, 20);
        
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
        }).setOrigin(0.5);

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
        }).setOrigin(0.5);
        
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
        }).setOrigin(0.5);

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
        }).setOrigin(0.5);

        // تأثير الاحتفال المحسن
        this.createEnhancedCelebrationEffect(width, height);
    }

    // 🔄 دالة الفوز مع النقر للمتابعة
    showWinMessageWithClickToContinue(prize) {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة مع تأثير ضبابي
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 165, 400, 330, 25);
        
        // صندوق الرسالة مع تدرج
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 170, 400, 330, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 170, 400, 330, 25);

        // حدود داخلية ذهبية
        const innerBorder = this.add.graphics();
        innerBorder.lineStyle(2, 0xd4af37, 0.8);
        innerBorder.strokeRoundedRect(width / 2 - 185, height / 2 - 155, 370, 300, 20);
        
        // نص التهنئة مع تأثيرات
        const congratsText = this.add.text(width / 2, height / 2 - 100, '🎉 مبروك! 🎉', {
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
        }).setOrigin(0.5);

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
        
        this.add.text(width / 2, height / 2 - 40, 'لقد فزت بـ', {
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
        }).setOrigin(0.5);
        
        const prizeText = this.add.text(width / 2, height / 2, prize, {
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
        }).setOrigin(0.5);

        // تأثير نبضة للجائزة
        this.tweens.add({
            targets: prizeText,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Power2.easeInOut'
        });
        
        this.add.text(width / 2, height / 2 + 50, 'اتجه للكاشير لاستلام جائزتك', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: '400',
            color: gameManager.colors.text,
            align: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);

        // 👆 رسالة النقر للمتابعة
        const clickToContinueText = this.add.text(width / 2, height / 2 + 100, '👆 اضغط في أي مكان للمتابعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: '400',
            color: gameManager.colors.primary,
            backgroundColor: 'rgba(196, 155, 65, 0.2)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

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

    // 🍀 دالة حظ سعيد مع النقر للمتابعة
    showLuckMessageWithClickToContinue() {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 115, 400, 230, 25);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 230, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 120, 400, 230, 25);

        // نص "حظ سعيد"
        const messageText = this.add.text(width / 2, height / 2 - 40, '🍀 حظ سعيد المرة القادمة!', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 5, 'استمر في المحاولة للفوز بجوائز رائعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: '500',
            color: gameManager.colors.text
        }).setOrigin(0.5);

        // 👆 رسالة النقر للمتابعة
        const clickToContinueText = this.add.text(width / 2, height / 2 + 50, '👆 اضغط في أي مكان للمتابعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: '400',
            color: gameManager.colors.primary,
            backgroundColor: 'rgba(196, 155, 65, 0.2)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // تأثير نبضة للنص الرئيسي
        this.tweens.add({
            targets: messageText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
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

    showLuckMessage() {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 95, 400, 200, 25);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);

        // نص "حظ سعيد"
        const messageText = this.add.text(width / 2, height / 2 - 20, '🍀 حظ سعيد المرة القادمة!', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 25, 'استمر في المحاولة للفوز بجوائز رائعة', {
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
            repeat: 2,
            ease: 'Sine.easeInOut'
        });
    }

    // ⏰ دالة حاول لاحقاً مع النقر للمتابعة
    showTryLaterMessageWithClickToContinue() {
        const { width, height } = this.cameras.main;
        
        // خلفية شبه شفافة
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();
        
        // ظل الصندوق
        const messageShadow = this.add.graphics();
        messageShadow.fillStyle(0x000000, 0.4);
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 115, 400, 230, 25);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 120, 400, 230, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 120, 400, 230, 25);

        // نص "حاول في وقت لاحق"
        const messageText = this.add.text(width / 2, height / 2 - 40, '⏰ حاول في وقت لاحق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 5, 'عد مرة أخرى قريباً لجوائز أفضل', {
            fontFamily: 'Cairo, Arial',
            fontSize: '18px',
            fontWeight: '500',
            color: gameManager.colors.text
        }).setOrigin(0.5);

        // 👆 رسالة النقر للمتابعة
        const clickToContinueText = this.add.text(width / 2, height / 2 + 50, '👆 اضغط في أي مكان للمتابعة', {
            fontFamily: 'Cairo, Arial',
            fontSize: '16px',
            fontWeight: '400',
            color: gameManager.colors.primary,
            backgroundColor: 'rgba(196, 155, 65, 0.2)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

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
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 95, 400, 200, 25);
        
        // صندوق الرسالة
        const messageBox = this.add.graphics();
        messageBox.fillGradientStyle(0xfaf6e8, 0xf5f1e6, 0xe8dcc0, 0xf0e6d2, 1);
        messageBox.lineStyle(6, 0xc49b41);
        messageBox.fillRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);
        messageBox.strokeRoundedRect(width / 2 - 200, height / 2 - 100, 400, 200, 25);

        // نص "حاول في وقت لاحق"
        const messageText = this.add.text(width / 2, height / 2 - 20, '⏰ حاول في وقت لاحق', {
            fontFamily: 'Cairo, Arial',
            fontSize: '28px',
            fontWeight: 'bold',
            color: gameManager.colors.primary,
            stroke: gameManager.colors.dark,
            strokeThickness: 2
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 25, 'عد مرة أخرى قريباً لجوائز أفضل', {
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
        messageShadow.fillRoundedRect(width / 2 - 195, height / 2 - 95, 400, 200, 25);
        
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
        const buttonX = width - 60;
        const buttonY = 50;
        const buttonSize = 40;
        
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
            fontSize: '20px'
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
}

// ===== إعداد وتشغيل اللعبة =====
const gameManager = new GameManager();

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#f5f1e6',
    parent: 'gameContainer',
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false // تمكين Web Audio للأصوات
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
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
