// ====================================================
// HTML UI Logic & Transitions
// ====================================================
let isAppActive = false;
let userUploadedImgObj = null;

// Multi-language vocabulary for the download animation
const dlWords = [
    "Download", "下载", "ダウンロード", "Télécharger", 
    "Descargar", "Herunterladen", "Scarica", 
    "다운로드", "Baixar", "Скачать"
];

function startDownload() {
    document.getElementById('screen-download').classList.remove('active');
    document.getElementById('screen-downloading').classList.add('active');

    // Handle multi-language flashing text logic
    let wordIdx = 0;
    let flashText = document.getElementById('flash-text');
    let flashInterval = setInterval(() => {
        flashText.innerText = dlWords[wordIdx];
        wordIdx = (wordIdx + 1) % dlWords.length;
    }, 250);

    // Handle progress bar animation logic
    let progress = 0;
    let fill = document.getElementById('progress-fill');
    let pct = document.getElementById('progress-pct');
    
    let loaderInterval = setInterval(() => {
        progress += Math.random() * 2.5; // Simulate realistic network jumps
        if (progress > 100) progress = 100;
        
        fill.style.width = progress + '%';
        pct.innerText = 'Downloaded ' + Math.floor(progress) + '%';

        // When download finishes (100%), transition to Login screen
        if (progress === 100) {
            clearInterval(loaderInterval);
            clearInterval(flashInterval);
            
            setTimeout(() => {
                document.getElementById('screen-downloading').classList.remove('active');
                document.getElementById('screen-login').classList.add('active');
            }, 800);
        }
    }, 50);
}

// Enter the main app screen after login
function enterApp() {
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-main').classList.add('active');
    
    // Add a slight delay to allow CSS to calculate the panel width/height 
    // before resizing the p5.js canvas, preventing 0x0 size bugs.
    setTimeout(() => {
        isAppActive = true;
        windowResized();
    }, 150);
}

// Preview uploaded image locally
function previewImage(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('preview-container').style.display = 'block';
            
            // Preload the image into p5.js memory
            userUploadedImgObj = loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Interaction for the "Cast" button
function castToScreen() {
    let textInput = document.getElementById('user-text');
    let textVal = textInput.value.trim();

    // Cast user text
    if (textVal !== "") {
        spawnDisplayItem(textVal, 'TEXT');
        textInput.value = '';
    }

    // Cast user image (Ensure image is fully loaded to prevent dimension calculation errors)
    if (userUploadedImgObj) {
        if (userUploadedImgObj.width > 1) { 
            spawnDisplayItem(userUploadedImgObj, 'IMAGE');
            userUploadedImgObj = null; // Reset uploader
            document.getElementById('preview-container').style.display = 'none';
            document.getElementById('user-image').value = '';
        } else {
            // If image is still loading asynchronously, wait 100ms and try casting again
            setTimeout(castToScreen, 100);
        }
    }
}

// ====================================================
// p5.js Times Square Simulation Logic
// ====================================================
let p5Canvas;
let rightPanel;
let displayItems = [];

// NPC Multi-language sentences & their respective flag emojis
const npcData = [
    { text: "Just missed my train... again. New York is relentless.", flag: "🇺🇸" },
    { text: "祝我自己生日快乐！即使一个人也要好好过", flag: "🇨🇳" },
    { text: "疲れた、帰りたい。今日の仕事は終わらない", flag: "🇯🇵" },
    { text: "Café et croissant pour bien commencer cette journée grise", flag: "🇫🇷" },
    { text: "No puedo creer que esto esté pasando. Necesito un descanso", flag: "🇪🇸" },
    { text: "Das Wetter heute ist schrecklich. Ich bleibe im Bett.", flag: "🇩🇪" },
    { text: "Che giornata fantastica! Ho appena mangiato la pizza migliore della mia vita.", flag: "🇮🇹" },
    { text: "I just want to sleep for a thousand years.", flag: "🇺🇸" },
    { text: "비가 오니까 파전 먹고 싶다.", flag: "🇰🇷" },
    { text: "O trânsito em São Paulo está impossível hoje.", flag: "🇧🇷" },
    { text: "Я так устал от этих новостей. Выключите интернет.", flag: "🇷🇺" },
    { text: "Sometimes I wonder if anyone looks up at these screens.", flag: "🇬🇧" }
];

function setup() {
    rightPanel = document.getElementById('right-panel');
    let w = rightPanel.clientWidth || 600;
    let h = rightPanel.clientHeight || 400;
    p5Canvas = createCanvas(w, h);
    p5Canvas.parent('right-panel');
    frameRate(30);
}

function windowResized() {
    if (rightPanel && isAppActive) {
        let w = rightPanel.clientWidth;
        let h = rightPanel.clientHeight;
        if (w > 0 && h > 0) {
            resizeCanvas(w, h);
        }
    }
}

function draw() {
    // Pure minimal black background for the screen
    background(0);

    if (!isAppActive) return;

    // Periodically spawn random NPC cards from around the world
    if (frameCount % 90 === 0 && random() > 0.3) {
        let randomNpc = random(npcData);
        spawnDisplayItem(randomNpc, 'NPC');
    }

    // Update and render all active display items
    for (let i = displayItems.length - 1; i >= 0; i--) {
        let item = displayItems[i];
        item.update();
        item.display();
        
        // Remove item from array if marked as dead to free memory
        if (item.dead) {
            displayItems.splice(i, 1);
        }
    }
}

// Factory function to generate elements on screen
function spawnDisplayItem(content, type) {
    displayItems.push(new ScreenItem(content, type));
}

// =============== Screen Display Item Class ===============
class ScreenItem {
    constructor(content, type) {
        this.content = content;
        this.type = type; // Can be: 'TEXT', 'IMAGE', or 'NPC'
        this.dead = false;
        this.startTime = millis();
        
        // Assign appearance mode
        if (this.type === 'NPC') {
            this.mode = 'NPC_CARD';
        } else {
            // Mode 1: SCROLL (Flows continuously from left to right)
            // Mode 2: FADE_BLUR (Appears clearly, then fades and blurs out after 4 seconds)
            this.mode = random(['SCROLL', 'FADE_BLUR']);
        }

        this.initDimensions();
        this.initPosition();
    }

    // Initialize element dimensions securely based on its type
    initDimensions() {
        if (this.type === 'TEXT') {
            this.textSize = random(30, 60);
            textSize(this.textSize);
            textStyle(BOLD);
            textFont('sans-serif');
            this.w = textWidth(this.content) + 50;
            this.h = this.textSize * 1.5;
        } else if (this.type === 'IMAGE') {
            let aspect = this.content.width / this.content.height;
            this.h = random(200, 400);
            this.w = this.h * aspect;
            // Prevent the image from being larger than the screen
            if (this.w > width * 0.8) {
                this.w = width * 0.8;
                this.h = this.w / aspect;
            }
        } else if (this.type === 'NPC') {
            this.w = random(320, 450);
            this.h = random(120, 180);
        }
    }

    // Initialize starting position based on secure bounds
    initPosition() {
        if (this.mode === 'SCROLL') {
            // Start completely off-screen on the left
            this.x = -this.w - 50;
            this.y = random(20, max(21, height - this.h - 20)); // Used max() to prevent error
            this.speed = random(3, 7);
        } else { 
            // FADE_BLUR and NPC_CARD mode appear fixed inside the screen frame
            this.x = random(20, max(21, width - this.w - 20));
            this.y = random(20, max(21, height - this.h - 20));
        }
    }

    update() {
        let elapsed = millis() - this.startTime;

        if (this.mode === 'SCROLL') {
            // Move from left to right continuously
            this.x += this.speed; 
            // Mark dead once it fully exits the right side of the screen
            if (this.x > width + 50) this.dead = true; 
        } 
        else if (this.mode === 'FADE_BLUR') {
            // Lifespan set to 4 seconds (4000ms)
            if (elapsed > 4000) {
                this.dead = true;
            }
        }
        else if (this.mode === 'NPC_CARD') {
            // NPC cards stick around slightly longer (6 seconds) with an upward drift
            if (elapsed > 6000) {
                this.dead = true;
            }
            this.y -= 0.3; 
        }
    }

    display() {
        let elapsed = millis() - this.startTime;
        let alpha = 255;
        let blurAmt = 0;

        // Calculate Blur and Alpha transparency based on the lifespan stage
        if (this.mode === 'FADE_BLUR') {
            // Remains clear for the first 2 seconds. Fades & blurs from 2000ms to 4000ms
            if (elapsed > 2000) {
                let progress = (elapsed - 2000) / 2000; 
                blurAmt = progress * 20; 
                alpha = map(progress, 0, 1, 255, 0, true); 
            }
        } else if (this.mode === 'NPC_CARD') {
            // Natural fade-in and fade-out for NPCs
            if (elapsed < 800) {
                alpha = map(elapsed, 0, 800, 0, 255, true);
            } else if (elapsed > 5000) {
                alpha = map(elapsed, 5000, 6000, 255, 0, true);
            }
        }

        push();
        // Apply HTML5 native blur filter securely
        if (blurAmt > 0) {
            drawingContext.filter = `blur(${blurAmt}px)`;
        }

        // Render based on the type of element
        if (this.type === 'NPC') {
            // Draw White Background Card
            stroke(255, alpha);
            strokeWeight(2);
            fill(255, alpha); 
            rect(this.x, this.y, this.w, this.h);

            // Draw Black text over the white background (Standardized text drawing for broad compatibility)
            noStroke();
            fill(0, alpha); 
            textSize(18);
            textStyle(NORMAL);
            textAlign(LEFT, TOP);
            text(this.content.text, this.x + 20, this.y + 20, this.w - 40, this.h - 40);

            // Draw Country Flag Emoji in bottom right corner
            textSize(28);
            textAlign(RIGHT, BOTTOM);
            text(this.content.flag, this.x + this.w - 15, this.y + this.h - 10);
            
        } 
        else if (this.type === 'TEXT') {
            noStroke();
            fill(255, alpha); // White text for pure black background
            textSize(this.textSize);
            textStyle(BOLD);
            textAlign(LEFT, TOP);
            text(this.content, this.x, this.y);
        } 
        else if (this.type === 'IMAGE') {
            // Apply alpha via tint function for images
            tint(255, alpha);
            image(this.content, this.x, this.y, this.w, this.h);
        }

        // Reset filter to avoid breaking rendering states across frames
        drawingContext.filter = 'none'; 
        pop();
    }
}