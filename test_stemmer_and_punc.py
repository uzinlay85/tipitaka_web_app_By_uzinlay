"""Unit tests for Pali Morphological Stemmer, Canonical Search Ordering, and Prose Punctuation."""
import json
import os
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as appmod

class TestStemmerPuncSearch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = appmod.app.test_client()

    def test_pali_stemmer_candidates(self):
        cases = {
            'ဘဂဝတော': 'ဘဂဝါ',
            'ဘိက္ခဝေ': 'ဘိက္ခု',
            'ဘိက္ခူနံ': 'ဘိက္ခု',
            'ရာညော': 'ရာဇာ',
            'အာယသ္မတော': 'အာယသ္မာ',
            'ဒေဝိယာ': 'ဒေဝီ',
            'သဗ္ဗေသံ': 'သဗ္ဗ',
            'ဗုဒ္ဓဿ': 'ဗုဒ္ဓ',
        }
        for inflected, expected_stem in cases.items():
            cands = appmod.get_pali_stem_candidates(inflected)
            self.assertIn(expected_stem, cands, f"Expected {expected_stem} in candidates for {inflected}, got {cands}")

    def test_dict_lookup_all_target_inflections(self):
        # 6 user target words + 4 existing words
        test_words = [
            'ဘဂဝတော', 'ဘိက္ခဝေ', 'ဘိက္ခူနံ', 'ရာညော', 'အာယသ္မတော', 'ဒေဝိယာ',
            'ဗုဒ္ဓဿ', 'ဒိသွာ', 'ကတွာ', 'အရဟံ'
        ]
        for w in test_words:
            resp = self.client.get(f"/api/dictionary/lookup?word={w}")
            self.assertEqual(resp.status_code, 200)
            data = json.loads(resp.data.decode("utf-8"))
            self.assertTrue(len(data.get("results", [])) > 0, f"Expected definitions for {w}, got 0")
            self.assertTrue(len(data.get("matched_word", "")) > 0)

    def test_prose_punctuation_conversion(self):
        raw_prose = '<p class="bodytext">တယိဒံ, ဘော ပန, တထေဝ? န ဟိ ဘဝံ ပဝုစ္စတိ!</p>'
        purified = appmod.format_chattasangayana_pali(raw_prose)
        # Western comma should be replaced by Myanmar pada-thi (၊)
        self.assertNotIn(",", purified)
        self.assertIn("တယိဒံ၊", purified)
        # Question / exclamation marks should be replaced by Myanmar pada-ma (။)
        self.assertNotIn("?", purified)
        self.assertNotIn("!", purified)
        self.assertIn("တထေဝ။", purified)
        self.assertIn("ပဝုစ္စတိ။", purified)

    def test_chattha_vocative_and_particle_punctuation(self):
        import re
        strip_tags = lambda h: re.sub(r'<[^>]+>', '', h)

        # 1. User specific case: Na bhikkhave unadasavassena upasampadetabbo
        raw1 = '<p class="bodytext">‘‘န, ဘိက္ခဝေ, ဦနဒသဝဿေန ဥပသမ္ပာဒေတဗ္ဗော။ ယော ဥပသမ္ပာဒေယျ, အာပတ္တိ ဒုက္ကဋဿ။’’</p>'
        p1 = appmod.format_chattasangayana_pali(raw1)
        self.assertNotIn("န၊", p1, "န must not be followed by pada-thi")
        self.assertNotIn("၊ ဘိက္ခဝေ", p1, "ဘိက္ခဝေ must not be preceded by pada-thi")
        self.assertNotIn("ဘိက္ခဝေ၊", p1, "ဘိက္ခဝေ must not be followed by pada-thi")
        self.assertIn("န", strip_tags(p1))
        self.assertIn("န", p1)
        self.assertIn("ဘိက္ခဝေ", p1)
        self.assertIn("‘‘န</span> <span class=\"pali-word\">ဘိက္ခဝေ</span>", p1)
        self.assertIn("ဥပသမ္ပာဒေယျ၊", p1, "Legitimate clause ending must retain pada-thi")
        self.assertIn("ဒုက္ကဋဿ။", p1, "Sentence ending must retain pada-ma")

        # 2. Case with anchor tag: bhikkhave<a name="..."></a>
        raw2 = '<p class="bodytext">‘‘အနာပတ္တိ, ဘိက္ခဝေ<a name="T1.0158"></a>, ပါရာဇိကဿ၊</p>'
        p2 = appmod.format_chattasangayana_pali(raw2)
        self.assertNotIn("၊ ဘိက္ခဝေ", p2)
        self.assertNotIn("</a>၊", p2)
        self.assertIn('<a name="T1.0158"></a>', p2, "Anchor tag must be preserved")
        self.assertIn("ပါရာဇိကဿ၊", p2)

        # 3. King address (Maharaja) and Bhante cases
        raw3 = '<p class="bodytext">“နိဋ္ဌိတံ, မဟာရာဇ, ဝိဟာရပဋိသင်္ခရဏံ, ဣဒါနိ ဓမ္မဝိနယသင်္ဂဟံ ကရောမာ”တိ။ “သာဓု, ဘန္တေ, ဝိဿတ္ထာ ကရောထ,”</p>'
        p3 = appmod.format_chattasangayana_pali(raw3)
        self.assertNotIn("နိဋ္ဌိတံ၊", p3)
        self.assertNotIn("မဟာရာဇ၊", p3)
        self.assertNotIn("သာဓု၊", p3)
        self.assertNotIn("ဘန္တေ၊", p3)
        t3 = strip_tags(p3)
        self.assertIn("နိဋ္ဌိတံ မဟာရာဇ ဝိဟာရပဋိသင်္ခရဏံ၊", t3)
        self.assertIn("သာဓု ဘန္တေ ဝိဿတ္ထာ ကရောထ၊", t3)

    def test_canonical_book_order_in_phrase_search(self):
        with appmod.app.app_context():
            conn = appmod.get_pali_db()
            cur = conn.cursor()
            res = appmod.search_pali_phrase(cur, "ဧကံ သမယံ", page=1, limit=50)
            self.assertTrue(res["total"] > 0)
            results = res["results"]
            
            # Verify that all results are ordered by book canonical rowid
            book_ids = [r["book_id"] for r in results]
            book_orders = [cur.execute("SELECT rowid FROM books WHERE id=?", (bid,)).fetchone()[0] for bid in book_ids]
            
            for i in range(len(book_orders) - 1):
                curr_b = book_orders[i]
                next_b = book_orders[i + 1]
                if curr_b == next_b:
                    self.assertLessEqual(results[i]["page"], results[i + 1]["page"])
                else:
                    self.assertLess(curr_b, next_b, f"Book order violated: {book_ids[i]} ({curr_b}) came before {book_ids[i+1]} ({next_b})")

if __name__ == "__main__":
    unittest.main()
