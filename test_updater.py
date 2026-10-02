"""Unit tests for the In-App Updater API endpoint (/api/android-update)."""
import json
import os
import sys
import unittest
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as appmod

class TestAndroidUpdater(unittest.TestCase):
    def setUp(self):
        self.client = appmod.app.test_client()

    def test_default_android_update_endpoint(self):
        resp = self.client.get("/api/android-update")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("application/json", resp.content_type)
        
        # Verify 5-minute CDN cache header
        self.assertEqual(resp.headers.get("Cache-Control"), "public, max-age=300")

        data = json.loads(resp.data.decode("utf-8"))
        self.assertIn("versionCode", data)
        self.assertIn("versionName", data)
        self.assertIn("downloadUrl", data)
        self.assertIn("changelog", data)
        self.assertIn("forceUpdate", data)

        self.assertIsInstance(data["versionCode"], int)
        self.assertGreaterEqual(data["versionCode"], 1)
        self.assertTrue(data["downloadUrl"].startswith("http"))
        self.assertIsInstance(data["changelog"], str)
        self.assertFalse(data["forceUpdate"])

    def test_android_release_file_override(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            override_file = os.path.join(tmpdir, "android_release.json")
            custom_data = {
                "versionCode": 99,
                "versionName": "9.9.9",
                "downloadUrl": "https://example.com/custom.apk",
                "changelog": "Custom release notes"
            }
            with open(override_file, "w", encoding="utf-8") as f:
                json.dump(custom_data, f)

            orig_file = appmod._ANDROID_RELEASE_FILE
            try:
                appmod._ANDROID_RELEASE_FILE = override_file
                resp = self.client.get("/api/android-update")
                self.assertEqual(resp.status_code, 200)
                data = json.loads(resp.data.decode("utf-8"))
                self.assertEqual(data["versionCode"], 99)
                self.assertEqual(data["versionName"], "9.9.9")
                self.assertEqual(data["downloadUrl"], "https://example.com/custom.apk")
                self.assertEqual(data["changelog"], "Custom release notes")
            finally:
                appmod._ANDROID_RELEASE_FILE = orig_file

if __name__ == "__main__":
    unittest.main()
