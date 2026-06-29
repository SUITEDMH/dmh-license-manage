"""
Main LicenseManager class for DMH License System.

Usage example:
    from dmh_license import LicenseManager

    # At application startup:
    lm = LicenseManager(
        product="recorder",
        api_url="https://your-app.replit.app/api"
    )

    if not lm.check_and_prompt():
        # User cancelled or has no valid license
        sys.exit(0)

    # Application starts normally...
"""
import sys
from typing import Optional

from .machine_id import get_machine_id
from .storage import save_license_key, load_license_key, clear_license_key
from .validator import validate_online, ValidationResult


PRODUCT_NAMES = {
    "recorder": "Recorder",
    "cash_sheeter": "Cash Sheeter",
    "inventory": "Inventory",
    "suite": "Suite DMH",
}

TRIAL_DAYS = 7


class LicenseManager:
    """
    Manages license validation for a DMH Suite application.

    Args:
        product: Product code — one of: recorder, cash_sheeter, inventory, suite
        api_url: Base URL of the DMH License API
        trial_days: Number of trial days (default: 7)
    """

    def __init__(
        self,
        product: str,
        api_url: str,
        trial_days: int = TRIAL_DAYS,
    ):
        self.product = product
        self.product_name = PRODUCT_NAMES.get(product, product)
        self.api_url = api_url
        self.trial_days = trial_days
        self._machine_id: Optional[str] = None

    @property
    def machine_id(self) -> str:
        """Lazily compute and cache the machine ID."""
        if self._machine_id is None:
            self._machine_id = get_machine_id()
        return self._machine_id

    def validate(self, license_key: Optional[str] = None) -> ValidationResult:
        """
        Validate a license key online.

        Args:
            license_key: Key to validate. If None, uses the stored key.

        Returns:
            ValidationResult with validation status.
        """
        key = license_key or load_license_key(self.product)
        if not key:
            return ValidationResult(
                valid=False,
                message="Aucune licence trouvée.",
            )

        result = validate_online(
            api_url=self.api_url,
            license_key=key,
            machine_id=self.machine_id,
            product=self.product,
        )

        return result

    def activate(self, license_key: str) -> ValidationResult:
        """
        Activate a license key on this machine.

        Validates the key online and saves it locally if valid.

        Args:
            license_key: The license key to activate.

        Returns:
            ValidationResult with activation status.
        """
        license_key = license_key.strip().upper()
        result = validate_online(
            api_url=self.api_url,
            license_key=license_key,
            machine_id=self.machine_id,
            product=self.product,
        )

        if result.valid:
            save_license_key(self.product, license_key)

        return result

    def deactivate(self) -> None:
        """Remove the stored license key from this machine."""
        clear_license_key(self.product)

    def check_and_prompt(self, parent_window=None) -> bool:
        """
        Check the license and show a dialog if invalid.

        This is the main entry point for integrating into a PyQt/Tkinter app.
        Call this at application startup.

        Args:
            parent_window: Optional parent window for the dialog.

        Returns:
            True if the license is valid and the app should start.
            False if the user cancelled or has no valid license.
        """
        result = self.validate()

        if result.valid:
            self._show_expiry_warning(result)
            return True

        return self._show_license_dialog(parent_window, message=result.message)

    def _show_expiry_warning(self, result: ValidationResult) -> None:
        """Show a warning if the license is about to expire."""
        if result.days_remaining is not None and result.days_remaining <= 3:
            try:
                self._show_warning_tkinter(result)
            except Exception:
                pass

    def _show_warning_tkinter(self, result: ValidationResult) -> None:
        """Show expiry warning using tkinter."""
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showwarning(
            f"Licence {self.product_name}",
            f"Attention : votre licence expire dans {result.days_remaining} jour(s).\n"
            f"Veuillez contacter votre revendeur pour renouveler.",
        )
        root.destroy()

    def _show_license_dialog(self, parent_window=None, message: str = "") -> bool:
        """
        Show the license activation dialog.

        Tries PyQt5 first, falls back to tkinter.

        Returns:
            True if the user successfully activated a license.
        """
        try:
            return self._show_dialog_tkinter(parent_window, message)
        except Exception:
            return False

    def _show_dialog_tkinter(self, parent_window=None, message: str = "") -> bool:
        """License dialog using tkinter."""
        import tkinter as tk
        from tkinter import ttk, messagebox

        result_holder = {"activated": False}

        root = tk.Tk()
        root.title(f"Licence {self.product_name}")
        root.geometry("520x340")
        root.resizable(False, False)

        try:
            root.iconbitmap(default="")
        except Exception:
            pass

        main_frame = tk.Frame(root, padx=24, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Title
        title_label = tk.Label(
            main_frame,
            text=f"Activation de {self.product_name}",
            font=("Segoe UI", 14, "bold"),
        )
        title_label.pack(anchor="w")

        # Machine ID
        mid_frame = tk.Frame(main_frame, pady=8)
        mid_frame.pack(fill=tk.X)

        tk.Label(
            mid_frame,
            text="Identifiant machine :",
            font=("Segoe UI", 9),
            fg="#555555",
        ).pack(anchor="w")

        mid_value_frame = tk.Frame(mid_frame)
        mid_value_frame.pack(fill=tk.X)

        machine_id_var = tk.StringVar(value=self.machine_id)
        mid_entry = tk.Entry(
            mid_value_frame,
            textvariable=machine_id_var,
            font=("Consolas", 9),
            state="readonly",
            fg="#333333",
        )
        mid_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        def copy_machine_id():
            root.clipboard_clear()
            root.clipboard_append(self.machine_id)
            copy_btn.config(text="Copié ✓")
            root.after(2000, lambda: copy_btn.config(text="Copier"))

        copy_btn = tk.Button(
            mid_value_frame,
            text="Copier",
            font=("Segoe UI", 9),
            command=copy_machine_id,
        )
        copy_btn.pack(side=tk.LEFT, padx=(4, 0))

        # Status message
        if message:
            tk.Label(
                main_frame,
                text=message,
                font=("Segoe UI", 9),
                fg="#CC0000",
            ).pack(anchor="w", pady=(4, 0))

        # License key input
        tk.Label(
            main_frame,
            text="Clé de licence :",
            font=("Segoe UI", 9),
            fg="#555555",
        ).pack(anchor="w", pady=(12, 0))

        key_var = tk.StringVar()
        key_entry = tk.Entry(
            main_frame,
            textvariable=key_var,
            font=("Consolas", 11),
            width=44,
        )
        key_entry.pack(fill=tk.X, pady=(2, 0))
        key_entry.focus_set()

        # Status label
        status_var = tk.StringVar()
        status_label = tk.Label(
            main_frame,
            textvariable=status_var,
            font=("Segoe UI", 9),
            fg="#CC0000",
            wraplength=460,
            justify="left",
        )
        status_label.pack(anchor="w", pady=(4, 0))

        # Buttons
        btn_frame = tk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=(16, 0))

        def on_activate():
            key = key_var.get().strip()
            if not key:
                status_var.set("Veuillez entrer une clé de licence.")
                return

            status_var.set("Validation en cours...")
            status_label.config(fg="#555555")
            root.update()

            result = self.activate(key)
            if result.valid:
                messagebox.showinfo(
                    f"Licence {self.product_name}",
                    f"✓ {result.message}\n\nL'application va démarrer.",
                )
                result_holder["activated"] = True
                root.destroy()
            else:
                status_label.config(fg="#CC0000")
                status_var.set(result.message)

        def on_cancel():
            root.destroy()

        tk.Button(
            btn_frame,
            text="Quitter",
            font=("Segoe UI", 10),
            command=on_cancel,
            width=10,
        ).pack(side=tk.RIGHT, padx=(4, 0))

        tk.Button(
            btn_frame,
            text="Activer",
            font=("Segoe UI", 10, "bold"),
            command=on_activate,
            bg="#1a56db",
            fg="white",
            activebackground="#1e429f",
            activeforeground="white",
            width=10,
        ).pack(side=tk.RIGHT)

        key_entry.bind("<Return>", lambda e: on_activate())
        root.protocol("WM_DELETE_WINDOW", on_cancel)
        root.mainloop()

        return result_holder["activated"]

    def get_machine_id_display(self) -> str:
        """Return the machine ID for display to the user."""
        return self.machine_id
