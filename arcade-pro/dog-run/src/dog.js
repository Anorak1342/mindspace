//game defining variables
let canvas = document.querySelector('canvas');
let ctx = canvas.getContext('2d')

let obstacles = [];
let gameSpeed;
let gravity;
let score;
let highscore;
let dog;
let scoreText;
let highscoreText;
let keys = {};
let catImg = new Image();
catImg.src = 'src/assets/cat.png'
let puppySlideImg = new Image();
puppySlideImg.src = 'src/assets/puppy_slide.png'
let dogImg = new Image();
dogImg.src = 'src/assets/better_puppy_run.png';
let backgroundImg = new Image();
backgroundImg.src = 'src/assets/swamp.png';
let srcX = 0;
let srcY = 0;

let pupimgy = 0;
let puppySheetWidth = 248;
let puppySheetHeight = 37;
let widthOfIndivPuppy = puppySheetWidth / 3;

//rando comment

let startDx = 0;
let startDy = 0;
let startWidth = canvas.width;
let startHeight = canvas.height;

//event listeners
document.addEventListener('keydown', function(e) {
    keys[e.code] = true;
})

document.addEventListener('keyup', function(e) {
    keys[e.code] = false;
})

let imageSpeed = 6;

class Dog {
    constructor(sheetHeight, widthOfIndivSprite, imgx, imgy, height) {

     
        
        this.dy = 0;
        this.jumpHigh = 15;
        this.originalHeight = height;
        this.jumpTimer = 0;
        this.onGround = false;
        this.ogHeight = sheetHeight;
        this.widthOfIndivSprite = widthOfIndivSprite;
        this.sheetHeight = sheetHeight
        this.imgx = imgx
        this.imgy = imgy
        this.pupimgy = undefined
    }


    Draw(){
        
       
        ctx.drawImage(dogImg, this.widthOfIndivSprite * srcX, this.sheetHeight * srcY, this.widthOfIndivSprite, this.sheetHeight, this.imgx, this.imgy, this.widthOfIndivSprite, this.sheetHeight)
        if (srcX < 9) srcX++;
        else srcX = 1;

    }

    DrawSlide(){
        ctx.drawImage(puppySlideImg, widthOfIndivPuppy * srcX, puppySheetHeight * srcY, widthOfIndivPuppy, puppySheetHeight, this.imgx, this.imgy, widthOfIndivPuppy, this.sheetHeight)
        if (srcX < 1) srcX++;
        else srcX = 1;
    }

    DrawLoopAcrossPage(){
        //need to revise click start button with math, start button is rendered here as is stretched out to the whole canvas
        if (booleanForLoop === true) {

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(startImg, startImgDx, startImgDy, startImgWidth, startImgHeight)
        
         ctx.drawImage(dogImg, this.widthOfIndivSprite * srcX, this.sheetHeight * srcY, this.widthOfIndivSprite, this.sheetHeight, this.imgx, this.imgy,this.widthOfIndivSprite, this.sheetHeight)
            if (srcX < 9) srcX++;
            else srcX = 1;
            if (this.imgx < canvas.width + this.widthOfIndivSprite) this.imgx += imageSpeed;
            else this.imgx = 0 - this.widthOfIndivSprite
        }
    }

    Animation () {
        if (keys['Space'] || keys['KeyW']) {
            this.JumpFunction()
        } 
        else {
            this.jumpTimer = 0;
        
        }

        this.imgy += this.dy

        if (this.imgy + this.sheetHeight < canvas.height - 80) {
            this.dy += gravity
            this.onGround = false;
        }
        else {
            this.dy = 0;
            this.onGround = true;
            this.imgy = canvas.height - this.sheetHeight - 80
        }
        if (keys['ShiftLeft'] || keys['KeyS']) {
            this.sheetHeight = this.ogHeight / 2;
            this.DrawSlide();
        }
        else {
            this.sheetHeight = this.ogHeight
            this.Draw();
        }
        
        
    }

    JumpFunction() {
        if (this.onGround === true && this.jumpTimer === 0) {
            this.jumpTimer = 1;
            this.dy = -this.jumpHigh;
        }
        else if (this.jumpTimer > 0 && this.jumpTimer < 15){
            this.jumpTimer++;
            this.dy = -this.jumpHigh - (this.jumpTimer / 50)
        }
    }
}





class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        

        this.dx = -gameSpeed;
    }

    Update() {
        this.x += this.dx;
        this.Draw();
        this.dx = -gameSpeed;
    }
    
    Draw(){
        ctx.drawImage(catImg, this.x, this.y, this.width, this.height)
    }
}




class ScoreBoard {
    constructor(text, x, y, alignment, color, size) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.alignment = alignment;
        this.color = color;
        this.size = size;
    }

    Draw() {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.font = this.size + "px sans-serif";
        ctx.textAlign = this.alignment;
        ctx.fillText(this.text, this.x, this.y);
        ctx.closePath()
    }

}

let soundImg = new Image();
soundImg.src = 'src/assets/sound_icon.png'
let soundSheetWidth = 2001;
let soundSheetHeight = 1831;

class SoundButton {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    Draw() {
        ctx.drawImage(soundImg, 0, 0, soundSheetWidth, soundSheetHeight, this.x, this.y, this.width, this.height)
    }
}

//game controls 

function makeObstacles() {
    let sizeOfObstacle = randomNumber(20, 70)

    //0 is ground unit, 1 is in air unit
    let type = randomNumber(0, 1)
    let obstacle = new Obstacle(canvas.width + sizeOfObstacle, canvas.height - sizeOfObstacle - 80,
        sizeOfObstacle, sizeOfObstacle);

    if (type === 1) {
        obstacle.y -= dog.originalHeight - 10;
    }
    obstacles.push(obstacle)
}



function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// let audioPlay = true

// function toggleAudio(e) {
//     if (audioPlay === true) {
//         let calculate = window.getComputedStyle(canvas)
//         let spaceTop = parseInt(calculate.getPropertyValue('margin-top'))
//         let spaceLeft = parseInt(calculate.getPropertyValue('margin-left'))
//         if (e.x > spaceLeft + soundControl.x && e.x < spaceLeft + soundControl.x + soundControl.width &&
//             e.y > spaceTop + soundControl.y && e.y < spaceTop + soundControl.y + soundControl.height
//             ) {
//             document.getElementById("music_bg").pause();
//             audioPlay = false;
//             canvas.removeEventListener('click', toggleAudio)
//         }
//     }
// }

// function toggleAudioOff(e) {

//     if (audioPlay === false) {
//         let calculate = window.getComputedStyle(canvas)
//         let spaceTop = parseInt(calculate.getPropertyValue('margin-top'))
//         let spaceLeft = parseInt(calculate.getPropertyValue('margin-left'))
//         if (e.x > spaceLeft + soundControl.x && e.x < spaceLeft + soundControl.x + soundControl.width &&
//             e.y > spaceTop + soundControl.y && e.y < spaceTop + soundControl.y + soundControl.height
//         ) {
//             document.getElementById("music_bg").play();
//             audioPlay = true;
//             canvas.removeEventListener('click', toggleAudioOff)
//         }
//     }
// }

let audioOn = false;

function toStart(e) {
    let calculate = window.getComputedStyle(canvas)
    let spaceTop = parseInt(calculate.getPropertyValue('margin-top'))
    let spaceLeft = parseInt(calculate.getPropertyValue('margin-left'))

    //    if (e.x > spaceLeft + startImgDx && e.x < spaceLeft + startImgDx + startImgWidth &&
    //     e.y > spaceTop + startImgDy && e.y < spaceTop + startImgDy + startImgHeight
    //     ) {
       
        audioOn = true;
        gameSpeed = 6;
        gravity = 1;
        score = 0;
        highscore = 0;
        if (localStorage.getItem('highscore')) {
            highscore = localStorage.getItem('highscore')
        }

    document.removeEventListener('keydown', nextScreen)

        dog = new Dog(64, 85.9, 0, 0, 50)

        scoreText = new ScoreBoard("Score: " + score, 25, 25, "left", '#212121', "20")
        highscoreText = new ScoreBoard("Highscore: " + highscore, canvas.width - 30, 30, "right", "#212121", "20")
        // soundControl = new SoundButton(30, 30, 50, 50);

        if (audioOn === true) {
            document.getElementById("music_bg").play();
            document.getElementById("music_bg").volume = 0.3;
        }

    if (audioOn === true) {
        // canvas.addEventListener('click', toggleAudio)
        const theSoundButton = document.getElementById("audio-on-button")
        theSoundButton.addEventListener('click', () => {
            const musicFile = document.getElementById("music_bg")
            if (musicFile.paused) {
                musicFile.play();
                theSoundButton.src = "src/assets/sound_icon.png"
            }
            else {
                musicFile.pause()
                theSoundButton.src = "src/assets/audiooff.png"

            }
        })
    }
        if (continueTheGame === true) {
        requestAnimationFrame(update);
        }
        
        canvas.removeEventListener('click', toStart)

       
        booleanForLoop = false;
        
    // }
}


let startImg = new Image();
startImg.src = 'src/assets/start.png'
let startImgWidth = 350;
let startImgHeight = 280;
let startImgDx = 320;
let startImgDy = 100;
let booleanForLoop = true;



function test(){
   startDog.DrawLoopAcrossPage()
}
function doggyLoop(){
    window.setInterval(test, 1000 / 30)
}


function start (){
    canvas.width = 1000;
    canvas.height = 500;
    canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto; border:2px solid black; background-color: #556B2F;";

    
   

    // ctx.drawImage(startImg, startDx, startDy, startWidth, startHeight)

    startDog = new Dog(64, 85.9, 0, 400, 50)

    window.onload = doggyLoop();
    
    
    // canvas.addEventListener('click', toStart)
    canvas.addEventListener('click', directions)
}

let directionImg = new Image();
directionImg.src = 'src/assets/directions.png'
let directionsDx = 0
let directionsDy = 50
let directionsWidth = 980
let directionsHeight = 377

function directions(e) {
    let calculate = window.getComputedStyle(canvas)
    let spaceTop = parseInt(calculate.getPropertyValue('margin-top'))
    let spaceLeft = parseInt(calculate.getPropertyValue('margin-left'))
    if (e.x > spaceLeft + startImgDx && e.x < spaceLeft + startImgDx + startImgWidth &&
        e.y > spaceTop + startImgDy && e.y < spaceTop + startImgDy + startImgHeight
    ) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(directionImg, directionsDx, directionsDy, directionsWidth, directionsHeight)
    canvas.removeEventListener('click', toStart)
        booleanForLoop = false;

        document.addEventListener('keydown', nextScreen);

    }

}

function nextScreen() {
    if (keys['Enter']) {
        toStart()
    }
}




let restartImg = new Image();
restartImg.src = 'src/assets/reset.png'
let restartDx = 220;
let restartDy = 150;
let restartWidth = 573;
let restartHeight = 164;

function toRestart(e) {
    let calculate = window.getComputedStyle(canvas)
    let spaceTop = parseInt(calculate.getPropertyValue('margin-top'))
    let spaceLeft = parseInt(calculate.getPropertyValue('margin-left'))

    if (e.x > spaceLeft + restartDx && e.x < spaceLeft + restartDx + restartWidth &&
        e.y > spaceTop + restartDy && e.y < spaceTop + restartDy + restartHeight
    ) {

        window.localStorage.setItem('highscore', highscore)
        continueTheGame = true;
        obstacles = [];
        spawnTimer = initialObstacleSpawn;
        gameSpeed = 6;
        gravity = 1;
        score = 0;
        // highscore = 0;
        if (localStorage.getItem('highscore') ) {
            highscore = localStorage.getItem('highscore')
        }
        
        // if (highscore < localStorage.getItem('highscore')) {
        //     highscore = localStorage.getItem('highscore')
        // }


        // dog = new Dog(64, 85.9, 0, 0, 50)

        scoreText = new ScoreBoard("Score: " + score, 25, 25, "left", '#212121', "20")
        highscoreText = new ScoreBoard("Highscore: " + highscore, canvas.width - 30, 30, "right", "#212121", "20")
        // soundControl = new SoundButton(30, 30, 50, 50);

        // if (soundControl) {
        //     document.getElementById("music_bg").play();
        // }

        requestAnimationFrame(update);
        canvas.removeEventListener('click', toRestart)
        document.removeEventListener('keydown', nextScreen)


        booleanForLoop = false;
    }

}

let onRestart = false;

function restart() {
    // document.getElementById("music_bg").pause();
    // audioPlay = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 1000;
    canvas.height = 500;
    canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto; border:2px solid black; background-color: white;";

    ctx.drawImage(restartImg, restartDx, restartDy, restartWidth, restartHeight)


    canvas.addEventListener('click', toRestart)


    cancelAnimationFrame(update);

    continueTheGame = false;

    onRestart = true

}






let continueTheGame = true;
let initialObstacleSpawn = 100;
let spawnTimer = initialObstacleSpawn;



const update = () => {


    if (continueTheGame === true) {
    requestAnimationFrame(update);
    }
    // clears canvas before drawing every time
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)

    spawnTimer--;
    if (spawnTimer <= 0) {
        makeObstacles();
        spawnTimer = initialObstacleSpawn - gameSpeed * 8;

        if (spawnTimer < 60) {
            spawnTimer = 60;
        }
    }


    for (i = 0; i < obstacles.length; i++) {
        let indivObstacle = obstacles[i];

        if (indivObstacle.x + indivObstacle.width < 0) {
            //delete it will help will memory and frame issues
            obstacles.splice(i, 1);
        } 

        if (
            dog.imgx < indivObstacle.x + indivObstacle.width && 
            dog.imgx + dog.widthOfIndivSprite > indivObstacle.x &&
            dog.imgy < indivObstacle.y + indivObstacle.height && 
            dog.imgy + dog.sheetHeight > indivObstacle.y
            ) 
            {
                // obstacles = [];
                // score = 0;
                // spawnTimer = initialObstacleSpawn;
                // gameSpeed = 3;
                // window.localStorage.setItem('highscore', highscore)
                continueTheGame = false
                restart()
                
            }
            
            if (continueTheGame === true) {
        indivObstacle.Update()
            }
    }
    if (continueTheGame === true) {

    dog.Animation();
    score++;
    scoreText.text = "Score: " + score
    scoreText.Draw();
    // soundControl.Draw();

    if (score > highscore) {
        highscore = score;
        highscoreText.text = "Highscore: " + highscore;
       
    }

    highscoreText.Draw()


    gameSpeed += 0.003;
    }
}




window.onload = start;





