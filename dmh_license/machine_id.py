"""
Machine ID Generator for DMH License System
Generates a unique hardware fingerprint for Windows machines.
"""
import subprocess
import hashlib
import platform


def _run_wmic(wmic_path: str) -> str:
    """Run a WMIC command and return the output."""
    try:
        result = subprocess.run(
            ["wmic"] + wmic_path.split() + ["get", "SerialNumber"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        # Skip the header line "SerialNumber"
        values = [line for line in lines if line and line.lower() != "serialnumber"]
        return values[0] if values else ""
    except Exception:
        return ""


def _get_cpu_id() -> str:
    """Get CPU identifier."""
    try:
        result = subprocess.run(
            ["wmic", "cpu", "get", "ProcessorId"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        values = [l for l in lines if l.lower() != "processorid"]
        return values[0] if values else ""
    except Exception:
        return ""


def _get_disk_serial() -> str:
    """Get primary disk serial number."""
    try:
        result = subprocess.run(
            ["wmic", "diskdrive", "get", "SerialNumber"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        values = [l for l in lines if l.lower() != "serialnumber" and l]
        return values[0] if values else ""
    except Exception:
        return ""


def _get_bios_serial() -> str:
    """Get BIOS serial number."""
    try:
        result = subprocess.run(
            ["wmic", "bios", "get", "SerialNumber"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        values = [l for l in lines if l.lower() != "serialnumber" and l]
        return values[0] if values else ""
    except Exception:
        return ""


def _get_motherboard_serial() -> str:
    """Get motherboard serial number."""
    try:
        result = subprocess.run(
            ["wmic", "baseboard", "get", "SerialNumber"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        values = [l for l in lines if l.lower() != "serialnumber" and l]
        return values[0] if values else ""
    except Exception:
        return ""


def get_machine_id() -> str:
    """
    Generate a unique machine identifier based on hardware components.

    Returns a SHA-256 hash of combined hardware identifiers.
    This ID is stable across reboots and OS reinstalls (as long as hardware doesn't change).

    Returns:
        str: A 64-character hex string uniquely identifying this machine.

    Raises:
        RuntimeError: If the operating system is not Windows.
    """
    if platform.system() != "Windows":
        raise RuntimeError(
            "DMH License: Ce module est conçu pour Windows uniquement."
        )

    cpu_id = _get_cpu_id()
    disk_serial = _get_disk_serial()
    bios_serial = _get_bios_serial()
    motherboard_serial = _get_motherboard_serial()

    # Combine all hardware identifiers
    combined = f"{cpu_id}|{disk_serial}|{bios_serial}|{motherboard_serial}"

    if combined == "|||":
        # Fallback: use a combination of less reliable identifiers
        import socket
        import uuid
        node = hex(uuid.getnode())
        hostname = socket.gethostname()
        combined = f"fallback|{node}|{hostname}"

    machine_id = hashlib.sha256(combined.encode("utf-8")).hexdigest()
    return machine_id
