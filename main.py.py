import network
import time
import machine
import dht
import urequests

ssid = "MyWiFiNetwork"
password = "MyPassword123"
server_url = "http://192.168.1.14:3000/api/telemetry"
api_key = "halflife-esp32-key"

print("Booting up ESP32 Monitor...")

# Hardware setup based on the v2 schematic
sensor = dht.DHT22(machine.Pin(4))
led = machine.Pin(5, machine.Pin.OUT)
led.value(0) # start with LED off

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(ssid, password)

print("Connecting to WiFi", end="")
while not wlan.isconnected():
    print(".", end="")
    time.sleep(0.5)
print("\nConnected! IP Address:", wlan.ifconfig()[0])

while True:
    try:
        # make sure we are still online
        if not wlan.isconnected():
            print("WiFi disconnected! Reconnecting...")
            wlan.connect(ssid, password)
            while not wlan.isconnected():
                time.sleep(1)
            print("Reconnected.")

        print("Reading sensor...")
        sensor.measure()
        t = sensor.temperature()
        h = sensor.humidity()
        
        print(f"Temp: {t}C, Humidity: {h}%")
        
        # trigger local warning if it gets too hot (28C is the threshold for now)
        if t > 28.0:
            print("WARNING: Temp over 28! LED ON")
            led.value(1)
            alert = 1
        else:
            led.value(0)
            alert = 0
            
        payload = {
            "temperature": t,
            "humidity": h,
            "alert_active": alert
        }
        
        headers = {"Content-Type": "application/json", "x-api-key": api_key}
        
        print(f"Sending POST to {server_url}...")
        res = urequests.post(server_url, json=payload, headers=headers)
        print("Server responded with status:", res.status_code)
        
        # MUST close this or the ESP32 will run out of memory after a few hours
        res.close()
        
    except Exception as e:
        # just log it and keep going, don't crash the loop
        print("An error occurred in the loop:", e)
        
    print("Sleeping for 15 seconds...\n---")
    time.sleep(15)