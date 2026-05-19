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
    client.connect(broker_host, broker_port)
    client.loop_start()
    logger.info("Connected to MQTT %s:%d, publishing %d devices every %.1fs", broker_host, broker_port, len(device_ids), interval)

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
                # simple realistic distance: full=0cm, empty=max_height_cm
                fill_fraction = max(0.0, min(1.0, random.normalvariate(0.35, 0.15)))
                distance_cm = max_height_cm * (1.0 - fill_fraction)
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
    p.add_argument("--max-height", type=float, dest="max_height", default=float(os.getenv("MAX_HEIGHT_CM", 100.0)))
    return p.parse_args(argv)

def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args(argv)
    device_ids = generate_device_ids(args.count)
    publish_loop(args.broker, args.port, device_ids, args.interval, args.max_height)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())