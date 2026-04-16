# 🦭 Sealfy Messenger (MVP)

> A quiet harbor in the ocean of communication. A seal-themed, anti-stress social network and real-time messenger.

![Build Status](https://img.shields.io/badge/Status-MVP-success)
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)
![React Version](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## 📖 Overview
Sealfy is an innovative messenger built with a focus on tranquility and community ("Rookeries"). This MVP demonstrates a fully functional, monolithic real-time chat architecture using a Golang backend and a React (Vite) frontend.

## ✨ Core Features (MVP)
* **Real-time Messaging:** Zero-latency message delivery using an optimized in-memory store and polling mechanism.
* **Smart Media Parser:** Automatically detects and embeds images, `.mp4`/`.webm` direct links, and YouTube iframes directly within the chat UI.
* **Global Drag & Drop:** Seamlessly upload media files to the server by dropping them anywhere on the screen.
* **Client-side Auth:** Local storage-based user profiling (Display Name + @username).
* **Dynamic Theming:** Built-in Light, Dark, and System-synced UI palettes.

## 🛠 Tech Stack
* **Frontend:** React.js, Vite, Raw CSS (Responsive & themable)
* **Backend:** Golang, Gin Web Framework
* **Storage (MVP):** In-memory array (Mutex-protected) + Local file system for uploads.

## 🚀 Quick Start (Local Deployment)

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/sealfy-messenger-mvp.git](https://github.com/your-username/sealfy-messenger-mvp.git)
   cd sealfy-messenger-mvp
