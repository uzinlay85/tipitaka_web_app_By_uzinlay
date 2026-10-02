"""Unit tests for the Hierarchical TOC tree builder and level normalization."""
import unittest

def get_toc_level(t):
    if t is None:
        return 1
    s = str(t).strip().lower()
    if s in ('chapter', '1'):
        return 1
    if s in ('title', '2'):
        return 2
    if s in ('subhead', '3'):
        return 3
    if s in ('subsubhead', 'subsubhead-head', '4'):
        return 4
    if s == '5':
        return 5
    if s == '6':
        return 6
    try:
        n = int(s)
        if 1 <= n <= 10:
            return n
    except ValueError:
        pass
    return 1

def build_toc_tree(items):
    roots = []
    stack = []
    for idx, it in enumerate(items):
        lvl = get_toc_level(it.get("type"))
        node = {
            "index": idx,
            "name": it.get("name"),
            "type": it.get("type"),
            "page": it.get("page_number", 1),
            "level": lvl,
            "children": [],
            "parentIndex": None
        }
        while stack and stack[-1]["level"] >= lvl:
            stack.pop()
        if not stack:
            roots.append(node)
        else:
            parent = stack[-1]
            node["parentIndex"] = parent["index"]
            parent["children"].append(node)
        stack.append(node)
    return roots

class TestTocTreeBuilder(unittest.TestCase):
    def test_standard_hierarchy(self):
        items = [
            {"name": "Chapter 1", "type": "chapter", "page_number": 1},
            {"name": "Sutta 1", "type": "title", "page_number": 1},
            {"name": "Section 1", "type": "subhead", "page_number": 2},
            {"name": "Section 2", "type": "subhead", "page_number": 3},
            {"name": "Sutta 2", "type": "title", "page_number": 5},
            {"name": "Chapter 2", "type": "chapter", "page_number": 10},
        ]
        tree = build_toc_tree(items)
        self.assertEqual(len(tree), 2)  # Two root chapters
        self.assertEqual(len(tree[0]["children"]), 2)  # Chapter 1 has 2 suttas
        self.assertEqual(len(tree[0]["children"][0]["children"]), 2)  # Sutta 1 has 2 sections
        self.assertEqual(len(tree[0]["children"][1]["children"]), 0)  # Sutta 2 has 0 sections
        self.assertEqual(len(tree[1]["children"]), 0)  # Chapter 2 has 0 suttas

    def test_level_skip_handling(self):
        # E.g. annya_bi_01 where L1 is followed directly by L3 (skipping L2)
        items = [
            {"name": "L1 Root", "type": "chapter", "page_number": 1},
            {"name": "L3 Child directly", "type": "subhead", "page_number": 1},
            {"name": "L3 Child 2", "type": "subhead", "page_number": 2},
        ]
        tree = build_toc_tree(items)
        self.assertEqual(len(tree), 1)
        self.assertEqual(len(tree[0]["children"]), 2)
        self.assertEqual(tree[0]["children"][0]["parentIndex"], 0)

    def test_same_page_siblings(self):
        # Multiple entries starting on the exact same page
        items = [
            {"name": "Chapter 1", "type": "1", "page_number": 1},
            {"name": "Sutta 1", "type": "2", "page_number": 1},
            {"name": "Sutta 2", "type": "2", "page_number": 1},
        ]
        tree = build_toc_tree(items)
        self.assertEqual(len(tree), 1)
        self.assertEqual(len(tree[0]["children"]), 2)
        self.assertEqual(tree[0]["children"][0]["name"], "Sutta 1")
        self.assertEqual(tree[0]["children"][1]["name"], "Sutta 2")

    def test_degenerate_all_l1(self):
        # Book with all items at same level -> all become roots (flat fallback)
        items = [
            {"name": "Item A", "type": "1", "page_number": 1},
            {"name": "Item B", "type": "1", "page_number": 5},
            {"name": "Item C", "type": "1", "page_number": 10},
        ]
        tree = build_toc_tree(items)
        self.assertEqual(len(tree), 3)
        for r in tree:
            self.assertEqual(len(r["children"]), 0)

    def test_deep_nesting_l1_to_l6(self):
        # Myanmar books with up to Level 6
        items = [
            {"name": "L1", "type": 1, "page_number": 1},
            {"name": "L2", "type": 2, "page_number": 1},
            {"name": "L3", "type": 3, "page_number": 2},
            {"name": "L4", "type": 4, "page_number": 3},
            {"name": "L5", "type": 5, "page_number": 4},
            {"name": "L6", "type": 6, "page_number": 5},
        ]
        tree = build_toc_tree(items)
        self.assertEqual(len(tree), 1)
        curr = tree[0]
        for expected_lvl in range(2, 7):
            self.assertEqual(len(curr["children"]), 1)
            curr = curr["children"][0]
            self.assertEqual(curr["level"], expected_lvl)

if __name__ == '__main__':
    unittest.main()
