# Deck Builder

## Introduction
Deck Builder is a web application that helps you create and manage card decks. It has two parts:
1. A **frontend** (the visual interface you interact with) built using **Angular**.
2. A **backend** (the part that handles data and logic) built using **Express.js**.

This guide will walk you through installing everything you need and running the app on your computer.

---

## What You Need
Before you can use Deck Builder, you need to install two main tools:

### 1. Install Node.js
Node.js helps run the backend and manage dependencies.

#### **How to Install Node.js:**
- Go to [nodejs.org](https://nodejs.org/) and download the **LTS** (Long-Term Support) version.
- Install it by following the instructions.
- Check if it's installed by opening **Command Prompt** (Windows) or **Terminal** (Mac/Linux) and typing:
  ```sh
  node -v  
  npm -v   
  ```
  You should see version numbers appear.

### 2. Install Angular CLI
Angular CLI is a tool that helps run the frontend of the app.
```sh
npm install -g @angular/cli
```
To check if it's installed:
```sh
ng version
```

---

## Setting Up the App

### 1. Download the Project
You need to get a copy of the project files on your computer.

#### Option 1: Download the ZIP file
- Go to [this GitHub link](https://github.com/aidanPuricelli/mtg-arena/tree/master).
- Click the **Download ZIP** button.
- Extract the downloaded file on your computer.
- Open a terminal or command prompt and navigate to the extracted folder.

#### Option 2: Clone the Repository (For Git Users)
If you have Git installed, you can clone the repository directly:
```sh
git clone https://github.com/aidanPuricelli/mtg-arena.git
cd mtg-arena
```
```sh
git clone <repository-url>
cd deck-builder
```

### 2. Install Required Files
Once inside the project folder, install everything needed to run the app:
```sh
npm install
```

---

## Running the App
### 1. Start the Backend (Express Server)
The backend is responsible for handling deck data.

- Go to the `server` folder:
  ```sh
  cd server
  ```
- Start the server by typing:
  ```sh
  node server.js
  ```

This keeps running in the background. If it stops, restart it with the same command.

### 2. Start the Frontend (Angular App)
Go back to the main project folder and type:
```sh
ng serve
```
After a few seconds, open your web browser and go to:
```
http://localhost:4200/
```
This will display the Deck Builder app!

---

## How the App Works
The backend (Express) serves data from `server/deck.json`. The frontend (Angular) sends requests to get this data and display it.

### Proxy Configuration
To make sure the frontend connects to the backend correctly, the file `proxy.conf.json` helps route requests properly.

---

## Development (For Advanced Users)
If you want to make changes while working on the backend:
```sh
npm install -g nodemon
nodemon server/server.js
```
For frontend updates:
```sh
ng serve --open
```

---

## Building the App
If you want to create a final version of the app to share with others, type:
```sh
ng build --prod
```
This will generate all necessary files in a folder called `dist/`.

---

## Troubleshooting
- If another program is using **port 4200**, close that program or run:
  ```sh
  ng serve --port 4300
  ```
  (This runs the frontend on a different port.)
- If there’s a backend issue, restart the server using:
  ```sh
  node server.js
  ```

---

