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

    def test_tika_to_attha(self):
        # pali_attha_tika_match also stores 2-hop rows (attha -> tika), so a
        # Ṭīkā source must resolve its Mūla root, not the first matching base row.
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'tika_vi_02',
            'source_page': 297,
            'target_type': 'attha'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'attha_vi_01_02')
        self.assertEqual(data.get('target_page'), 103)

    def test_tika_to_mula(self):
        res = self.client.get('/api/match/pali_to_companion', query_string={
            'source_book': 'tika_vi_02',
            'source_page': 297,
            'target_type': 'pali'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('matched'))
        self.assertEqual(data.get('target_book'), 'mula_vi_01')
        self.assertEqual(data.get('target_page'), 150)

    def test_para_to_page_exact(self):
        # mula_vi_01 para 250 -> mula p.162 (exact paragraph marker)
        res = self.client.get('/api/match/para_to_page', query_string={
            'pali_book_id': 'mula_vi_01', 'para': 250
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('pali_book_id'), 'mula_vi_01')
        self.assertEqual(data.get('pali_page'), 162)
        self.assertEqual(data.get('matched_para'), 250)
        self.assertNotIn('approximate', data)

    def test_para_to_page_nearest_commentary_marker(self):
        # Aṭṭhakathā volumes only mark selected paragraph boundaries (233 -> 424),
        # so clicking mula para 250 must still move the companion pane.
        res = self.client.get('/api/match/para_to_page', query_string={
            'pali_book_id': 'attha_vi_01_02', 'para': 250
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('pali_book_id'), 'attha_vi_01_02')
        self.assertEqual(data.get('pali_page'), 111)
        self.assertEqual(data.get('matched_para'), 240)
        self.assertTrue(data.get('approximate'))

    def test_para_to_page_before_first_commentary_marker(self):
        res = self.client.get('/api/match/para_to_page', query_string={
            'pali_book_id': 'attha_vi_01_02', 'para': 5
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('pali_book_id'), 'attha_vi_01_02')
        self.assertEqual(data.get('pali_page'), 1)
        self.assertEqual(data.get('matched_para'), 162)
        self.assertTrue(data.get('approximate'))

    def test_para_to_page_nearest_mm_translation(self):
        # 01_vinaya_01 has no paragraph 171 (mula does); fall back to 170 p.96.
        res = self.client.get('/api/match/para_to_page', query_string={
            'mm_book_id': '01_vinaya_01', 'para': 171
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('mm_book_id'), '01_vinaya_01')
        self.assertEqual(data.get('mm_page'), 96)
        self.assertEqual(data.get('mm_para'), 170)
        self.assertTrue(data.get('approximate'))

    def test_missing_params(self):
        res = self.client.get('/api/match/pali_to_companion')
        self.assertEqual(res.status_code, 400)

if __name__ == '__main__':
    unittest.main()
