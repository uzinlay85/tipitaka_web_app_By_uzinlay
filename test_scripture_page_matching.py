"""Comprehensive tests for two-way scripture page matching across Pali, MM, Attha, and Tika."""
import unittest
from app import app

class TestScripturePageMatching(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_pali_to_attha(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'mula_vi_01',
            'source_page': 150,
            'target_type': 'attha'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'attha_vi_01_02')
        self.assertEqual(data.get('target_page'), 103)

    def test_pali_to_tika(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'mula_vi_01',
            'source_page': 150,
            'target_type': 'tika'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'tika_vi_02')
        self.assertEqual(data.get('target_page'), 297)

    def test_pali_to_mm(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'mula_vi_01',
            'source_page': 150,
            'target_type': 'mm'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), '01_vinaya_01')
        self.assertEqual(data.get('target_page'), 157)

    def test_mm_to_pali(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': '01_vinaya_01',
            'source_page': 157,
            'target_type': 'pali'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'mula_vi_01')
        self.assertEqual(data.get('target_page'), 150)

    def test_mm_to_attha(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': '01_vinaya_01',
            'source_page': 157,
            'target_type': 'attha'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'attha_vi_01_02')
        self.assertEqual(data.get('target_page'), 103)

    def test_attha_to_pali(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'attha_vi_01_02',
            'source_page': 103,
            'target_type': 'pali'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'mula_vi_01')
        self.assertEqual(data.get('target_page'), 150)

    def test_attha_to_mm(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'attha_vi_01_02',
            'source_page': 103,
            'target_type': 'mm'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), '01_vinaya_01')
        self.assertEqual(data.get('target_page'), 157)

    def test_missing_params(self):
        res = self.client.get('/api/match/pali_to_companion')
        self.assertEqual(res.status_code, 400)

if __name__ == '__main__':
    unittest.main()
