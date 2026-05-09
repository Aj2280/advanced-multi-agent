from __future__ import annotations

import argparse
import time

from observability.metrics import Metrics


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=None)
    args = p.parse_args()

    Metrics(port=args.port)
    print("Serving Prometheus metrics. Open: http://localhost:9102/metrics")
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    raise SystemExit(main())

