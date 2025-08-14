# 🚍 Vehicle Tracking Management (SchoolBus 2.0)

A **React** web application that simulates **real-time vehicle movement** on a map using the **Google Maps JavaScript API** and dummy location data. The app displays the vehicle’s live position, draws its route with polylines, and includes controls to play or pause the movement simulation.

---

## 📌 Features

* **Google Maps Integration** – Powered by the Google Maps JavaScript API.
* **Dummy Route Data** – Stored locally in `dummy-route.json`.
* **Real-Time Simulation** – Vehicle marker updates every few seconds.
* **Route Drawing** – Polyline shows the traveled path.
* **Optional Metadata** – Speed, elapsed time, and timestamps.
* **Play/Pause Control** – Start or stop the simulation anytime.

---

## 📂 Project Structure

```
.
├── public
│   ├── dummy-route.json
├── src
│   ├── components
│   │   └── MapComponent.jsx
│   ├── App.jsx
│   ├── App.css
│   └── index.js
└── README.md
```

---

## 🛠️ Technologies Used

* **React** (JavaScript, JSX)
* **Google Maps JavaScript API**

---

## 📄 Dummy Data Format

Example `dummy-route.json`:

```json
[
  { "latitude": 17.385044, "longitude": 78.486671, "timestamp": "2024-07-20T10:00:00Z" },
  { "latitude": 17.385045, "longitude": 78.486672, "timestamp": "2024-07-20T10:00:05Z" },
  { "latitude": 17.385050, "longitude": 78.486680, "timestamp": "2024-07-20T10:00:10Z" }
]
```

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/vehicle-tracking-management.git
cd vehicle-tracking-management
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Add Your Google Maps API Key

* Open `public/index.html`
* Replace `YOUR_API_KEY` with your actual Google Maps JavaScript API key.

```html
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap"></script>
```

### 4️⃣ Run the Project

```bash
npm run dev
```
