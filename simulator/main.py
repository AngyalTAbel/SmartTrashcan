import argparse
import logging
import os
import random
import signal
import sys
import time

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

def generate_device_ids(count: int, prefix: str = "can") -> list[str]:
    return [f"{prefix}-{i:03d}" for i in range(1, count + 1)]

def publish_loop(
    broker_host: str,
    broker_port: int,
    device_ids: list[str],
    interval: float,
    max_height_cm: float,
):
    client = mqtt.Client()
    
    # Belső állapot a telítettség tárolására
    # 0.0 = üres (távolság = max_height_cm)
    # 1.0 = tele (távolság = 0)
    fill_levels = { device: random.uniform(0.0, 0.4) for device in device_ids }

    def on_message(client, userdata, msg):
        # Ha érkezik egy üzenet az ürítésről, nullázzuk a belső állapotot
        # Várjuk a "trashcan/public/+/empty" topicot
        logger.info("MQTT message received on topic: %s", msg.topic)
        topic_parts = msg.topic.split('/')
        if len(topic_parts) == 4 and topic_parts[3] == "empty":
            device_id = topic_parts[2]
            if device_id in fill_levels:
                logger.info("Manual empty received for %s, resetting simulator state to 0.0", device_id)
                fill_levels[device_id] = 0.0
            else:
                logger.warning("Received empty for unknown device: %s", device_id)

    client.on_message = on_message
    client.connect(broker_host, broker_port)
    
    # Feliratkozunk az ürítési parancsokra
    # Használjunk wildkardot a biztonság kedvéért
    client.subscribe("trashcan/public/+/empty")
    logger.info("Subscribed to trashcan/public/+/empty")
        
    client.loop_start()
    logger.info("Connected to MQTT %s:%d, simulator started", broker_host, broker_port)

    def stop(signum=None, frame=None):
        logger.info("Stopping simulator")
        client.loop_stop()
        client.disconnect()
        raise KeyboardInterrupt

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    try:
        while True:
            for device in device_ids:
                if device in ["can-001", "can-002"]:
                    # Közepes telítődés: ~3-4 perc alatt tele (0.02 * 12 * 4 ≈ 1.0)
                    increment = max(0.0, random.normalvariate(0.02, 0.005))
                else:
                    # Nagyon lassú telítődés: ~0.1% - 0.5% per tick
                    increment = max(0.0, random.normalvariate(0.003, 0.001))
                
                fill_levels[device] = min(1.0, fill_levels[device] + increment)

                # Távolság számítása: ha 100% tele (1.0), akkor distance = 0
                # Ha 0% tele (0.0), akkor distance = max_height_cm
                distance_cm = max_height_cm * (1.0 - fill_levels[device])
                
                # Biztosítsuk, hogy ne menjen 0 alá a mérés
                distance_cm = max(0.0, distance_cm)

                topic = f"trashcan/public/{device}/distance"
                payload = f"{distance_cm:.2f}"
                client.publish(topic, payload)
                
            time.sleep(interval)
    except KeyboardInterrupt:
        logger.info("Exited publish loop")

def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Simple trashcan simulator (paho-mqtt)")
    p.add_argument("--broker", default=os.getenv("BROKER_HOST", "mosquitto"))
    p.add_argument("--port", type=int, default=int(os.getenv("BROKER_PORT", 1883)))
    p.add_argument("--count", type=int, default=int(os.getenv("DEVICE_COUNT", 5)))
    p.add_argument("--interval", type=float, default=float(os.getenv("PUBLISH_INTERVAL", 5.0)))
    p.add_argument("--max-height", type=float, dest="max_height", default=float(os.getenv("MAX_HEIGHT_CM", 180.0)))
    return p.parse_args(argv)

def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args(argv)
    device_ids = generate_device_ids(args.count)
    publish_loop(args.broker, args.port, device_ids, args.interval, args.max_height)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())