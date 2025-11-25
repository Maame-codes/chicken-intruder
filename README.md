# 🐔 Chicken Intruder

### A cross-platform space shooter built with React Native & Expo.

[![Netlify Status](https://api.netlify.com/api/v1/badges/b5c7d8a6-1234-5678-90ab-cdef12345678/deploy-status)](https://chickenintruder.netlify.app/)

## 🚀 Play the Live Demo

**Click below to play instantly in your browser (Mobile or Desktop):**
<br>
👉 **[https://chickenintruder.netlify.app/](https://chickenintruder.netlify.app/)**

---

## 📖 About

**Chicken Intruder** is a high-performance 2D arcade shooter inspired by classic retro games. It demonstrates the capabilities of **React Native for Web**, featuring a custom physics engine, procedural asset generation, and a responsive game loop running at 60 FPS.

Unlike standard apps, this project uses a unified codebase to run seamlessly on both **Mobile (Touch)** and **Desktop (Mouse)**.

## ✨ Key Engineering Features

- **🎮 Cross-Platform Engine:** Custom input handlers support `onTouchMove` (Mobile) and `onMouseMove` (Web) simultaneously.
- **🤖 Procedural Generation:** Enemies, Bosses, and Player Skins are generated procedurally using the **RoboHash API**, ensuring unique visuals every run.
- **⚔️ Dynamic Boss AI:** Bosses feature state-based logic, including movement patterns, health scaling based on level, and retaliatory fire.
- **🔫 Progression System:** Dynamic weapon upgrades (Single -> Double -> Spread) and falling power-ups.
- **🌌 Math-Based Rendering:** Features a code-generated starfield background to reduce asset load times and improve performance.
- **🔊 Audio Engine:** Integrated `expo-av` for background music and spatial sound effects.

## 🛠 Tech Stack

- **Framework:** React Native, Expo
- **Web Support:** React Native Web, React DOM
- **Hosting/CI:** Netlify (Continuous Deployment)
- **State Management:** React Hooks (`useRef` for physics loop, `useState` for UI sync)
- **Assets:** RoboHash API & Procedural Generation

## 🕹 Controls

- **Mobile:** Drag your finger anywhere on the screen to pilot the ship.
- **Desktop:** Use your mouse cursor to guide the ship.
- **Firing:** Auto-fire is enabled. Focus on dodging!

## 📦 How to Run Locally

1.  **Clone the repository**

    ```bash
    git clone [https://github.com/Maame-codes/chicken-intruder.git](https://github.com/Maame-codes/chicken-intruder.git)
    cd chicken-intruder
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Start the server**

    ```bash
    npx expo start
    ```

4.  **Launch**
    - Press `w` in the terminal to open in the Browser.
    - Or scan the QR code with the **Expo Go** app on your phone.

---

## 👨‍💻 Credits

**Built by:** Maame Afua A.P Fordjour
<br>
**GitHub:** [https://github.com/Maame-codes/chicken-intruder.git](https://github.com/Maame-codes/chicken-intruder.git)
