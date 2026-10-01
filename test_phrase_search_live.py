"""Regression test for multi-word phrase search on production/local databases."""
import unittest
from app import app

class TestPhraseSearchLive(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_pali_phrase_search_exact_8_matches(self):
        # The user's query: 'အာသဝါ တေ ပဒါလိတာ'
        res = self.client.get('/api/search', query_string={'q': 'အာသဝါ တေ ပဒါလိတာ', 'type': 'phrase'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('type'), 'phrase')
        self.assertEqual(data.get('total'), 8)
        self.assertEqual(len(data.get('results', [])), 8)
        for r in data['results']:
            self.assertIn('အာသဝါ', r['snippet'])
            self.assertIn('ပဒါလိတာ', r['snippet'])

    def test_pali_word_auto_delegates_to_phrase(self):
        # Default word tab search with multiple words auto-routes to phrase search
        res = self.client.get('/api/search', query_string={'q': 'အာသဝါ တေ ပဒါလိတာ', 'type': 'word'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('type'), 'phrase')
        self.assertEqual(data.get('total'), 8)

    def test_pali_single_word_unaffected(self):
        # Single word query still returns type='word' and total_occurrences
        res = self.client.get('/api/search', query_string={'q': 'ဗုဒ္ဓ', 'type': 'word'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('type'), 'word')
        self.assertIn('total_occurrences', data)
        self.assertGreater(data.get('total', 0), 0)

    def test_mm_phrase_search(self):
        # Myanmar phrase search
        res = self.client.get('/api/search', query_string={'q': 'သစ္စာလေးပါး', 'type': 'mm_phrase'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('type'), 'mm_phrase')
        self.assertGreater(data.get('total', 0), 0)
        self.assertGreater(len(data.get('results', [])), 0)

if __name__ == '__main__':
    unittest.main()
