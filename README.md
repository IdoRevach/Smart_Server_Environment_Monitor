# Smart Server Environment Monitor

I leave a local server running my backend projects 24/7, and I want a physical dashboard to monitor its physical environment. 

I'll use a Raspberry Pi 4, a DHT22 sensor, and some LEDs inside a custom case. The Pi will run a web server so I can check the stats, and the LEDs will alert me if the area around the hardware gets too warm.

## System Architecture

The system reads temperature and humidity data from the DHT22 sensor, processes it on the Raspberry Pi 4, and triggers the warning LEDs if thresholds are exceeded. Below is the initial design concept:

![System Architecture](images/system_architecture.png)

## Why a Raspberry Pi 4?

I know an ESP32 or Arduino could just read a sensor and turn on a light. The problem is that reading the live temperature is not enough here. I want to save the data history to see if the server area is getting hotter over time.

That is why I am going with the Pi 4. It works like an actual server. I can run Node.js and a SQLite database right on the board to keep months of records. Small microcontrollers do not handle databases and web dashboards very well. Also, having a real Linux system means I can easily add Discord or WhatsApp alerts later without dealing with annoying C++ network code.

## Hardware List

The core components for this build are:

* Raspberry Pi 4 Model B
* DHT22 Temperature and Humidity Sensor
* Red Warning LED
* Basic wiring parts (jumper wires and a resistor)

### Wiring Schematic

The schematic below outlines the GPIO connections for the components. The DHT22 requires 3.3V power, and the status LED is connected with a 330Ω resistor to prevent overdrawing current from the Pi.

![hardware-schematic](images/hardware-schematic.png)

### Software Stack

The backend is written in Node.js, running as a background service on the Pi. I wanted a lightweight stack that can poll the sensor, log the data, and serve a simple dashboard without eating up system resources.

*   **Node.js Server:** Handles the main polling loop for the DHT22 and runs the API endpoints.
*   **SQLite:** Used for local data logging. It's perfectly suited for this because it stores everything in a single local file, avoiding the overhead of a full database server while still letting me query historical temperature trends.
*   **GPIO Control:** The backend parses the sensor data and pulls GPIO17 HIGH to trigger the warning LED if the temperature crosses a defined threshold.
*   **Frontend Dashboard:** A basic HTML/JS page that fetches the latest stats from the Node API to display current temperature, humidity, and the LED warning status.

## Enclosure & 3D Design

I'm currently applying for a hardware grant through Hack Club's Half Life program, so I don't have the Raspberry Pi 4 or the sensors yet. To make sure the project is ready when the parts arrive, I designed a custom enclosure in Onshape.

Leaving a bare board and breadboard sitting on my server isn't ideal. Also, since Pi 4s are known to run hot, I had to make sure the board's heat wouldn't affect the DHT22 readings. The case design includes ventilation slots to isolate the sensor and allow for proper airflow.

The 3D renders and STL files are available below:

![Enclosure Internals](images/Screenshot_1.png)
![Enclosure Top View](images/Screenshot_2.png)
![Enclosure Side View](images/Screenshot_3.png)
![Enclosure Front View](images/Screenshot_4.png)

* [Base STL Model](stl/SentinelNode_RPi4_Base_v1.stl)
* [Lid STL Model](stl/SentinelNode_RPi4_Lid_v1.stl)

### Reality Check and Design Pivot
When I started putting together the final parts list I hit a wall with the Tier 2 funding limit. A Raspberry Pi 4 costs way more than the 65 dollars allowed. I looked into moving up to Tier 3, but that requires adding a motorized component to the build. Adding a fan or a servo just to inflate the budget felt like over engineering a project that should remain simple and reliable.

This forced me to look back at my original reason for using a Pi 4. I wanted to avoid writing annoying network code in C++ and I wanted a real database to keep history. Then I realized that the physical monitor is literally sitting right next to my 24/7 backend server. There is no reason the monitor itself needs to host the database.

I am swapping the Pi 4 for a cheap ESP32 C6 development board. The ESP32 will act as a dumb sensor node. All it has to do is read the DHT22 and send a basic HTTP POST request over the local Wi-Fi to my main server. My actual server will run the Node.js API, write the history to SQLite, and host the web dashboard. This keeps the project well within the Tier 2 budget and honestly makes the whole architecture much smarter by offloading the heavy work to the machine that is actually built for it.

### V2 Architecture: The Distributed Approach

With the pivot to the ESP32-C6, the system architecture is now distributed. The ESP32 acts purely as an edge sensor node, while my existing 24/7 server handles the backend logic, database, and dashboard.

**1. The Edge Node (ESP32-C6):**
The microcontroller's only job is to poll the DHT22 sensor for temperature and humidity data and send it as a JSON payload via HTTP POST requests over the local Wi-Fi. It also controls the red warning LED, toggling it based on predefined temperature thresholds to provide immediate physical feedback.

**2. The Backend (Existing Local Server):**
Instead of running on the monitor itself, the Node.js API and SQLite database now live on my main server. The backend receives the incoming POST requests, securely logs the timeseries data into the SQLite database, and serves the frontend web dashboard. 

Here is the updated system architecture:

![System Architecture V2](images/system_architecture_v2.png)

### Updated V2 Hardware Design

Below is the updated engineering schematic for the new ESP32-C6 electrical setup:

![Electrical Schematic V2](images/hardware_schematic_v2.png)

## 3D Enclosure
I had to update the Onshape model to fit the ESP32 footprint instead of the Pi. The case separates the sensor from the board's heat.

The 3D renders and STL files are available below:

![Case Front](images/New_Model.png)
![Case Side](images/New_Model_2.png)
![Case Internals](images/New_Model_3.png)

* [Base STL Model](stl/SentinelNode_ESP32_Base_v2.stl)
* [Lid STL Model](stl/SentinelNode_ESP32_Lid_v2.stl)

## Code & Setup
I uploaded everything straight to the root directory for now. (Note: I accidentally named them `main.py.py` and `server.js.js` on upload, just rename them back to normal when you clone).

* **ESP32:** Flash it with MicroPython, update the Wi-Fi details, and run `main.py`.
* **Backend:** Run `npm install express better-sqlite3`. 
* **Dashboard:** Make a folder called `public` next to the server script and put `index.html` inside it. 
* Run `node server.js` and hit port 3000 in your browser.
