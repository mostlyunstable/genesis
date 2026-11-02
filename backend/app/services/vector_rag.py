import re
import math
from collections import Counter, defaultdict
from typing import Dict, Any, List, Optional, Tuple

from backend.app.services.threat_intel import (
    MITRE_ATTACK_KNOWLEDGE,
    SIGMA_RULES_KNOWLEDGE,
    DEFENSIVE_PLAYBOOKS_KNOWLEDGE
)


class VectorKnowledgeRetriever:
    """
    Dense Vector Similarity & Hybrid RAG Knowledge Retriever (Stage D).
    Implements character n-gram subword vectorization and cosine similarity
    over MITRE ATT&CK techniques, Sigma detection rules, and defensive playbooks.
    Provides conceptual semantic retrieval without external GPU or network dependencies.
    """

    def __init__(self, ngram_range: Tuple[int, int] = (3, 4)):
        self.ngram_range = ngram_range
        self.documents: List[Dict[str, Any]] = []
        self.doc_vectors: List[Dict[str, float]] = []
        self.doc_norms: List[float] = []
        self.idf: Dict[str, float] = {}
        self.total_docs: int = 0
        self._build_index()

    def _tokenize_ngrams(self, text: str) -> List[str]:
        """Extracts cleaned tokens and subword character n-grams."""
        cleaned = re.sub(r'[^a-zA-Z0-9\s\-_\.]', ' ', text.lower())
        words = [w.strip() for w in cleaned.split() if len(w.strip()) >= 2]
        features = list(words)

        # Generate character n-grams for subword semantic capture
        for word in words:
            if len(word) >= 3:
                for n in range(self.ngram_range[0], min(self.ngram_range[1] + 1, len(word) + 1)):
                    for i in range(len(word) - n + 1):
                        features.append(word[i:i+n])

        return features

    def _build_index(self):
        """Constructs vector representations and Inverse Document Frequency (IDF) weights."""
        raw_docs: List[Dict[str, Any]] = []

        # 1. MITRE ATT&CK techniques
        for item in MITRE_ATTACK_KNOWLEDGE:
            content = f"{item['technique_id']} {item['technique_name']} {item['tactic']} {item['description']} {' '.join(item.get('keywords', []))} {item['detection_guidelines']} {' '.join(item.get('mitigations', []))}"
            raw_docs.append({
                "source": "mitre_attack",
                "id": item["technique_id"],
                "title": f"{item['technique_id']} - {item['technique_name']}",
                "tactic": item["tactic"],
                "content": content,
                "guidelines": item["detection_guidelines"],
                "mitigations": item["mitigations"],
                "raw": item
            })

        # 2. Sigma Rules
        for sigma in SIGMA_RULES_KNOWLEDGE:
            content = f"{sigma['rule_id']} {sigma['title']} {sigma['severity']} {sigma['logic']} {' '.join(sigma.get('false_positives', []))}"
            raw_docs.append({
                "source": "sigma_rule",
                "id": sigma["rule_id"],
                "title": sigma["title"],
                "severity": sigma["severity"],
                "content": content,
                "logic": sigma["logic"],
                "false_positives": sigma["false_positives"],
                "raw": sigma
            })

        # 3. Defensive Playbooks
        for pb in DEFENSIVE_PLAYBOOKS_KNOWLEDGE:
            content = f"{pb['playbook_id']} {pb['name']} {pb['target_type']} {' '.join(pb.get('containment_actions', []))} {' '.join(pb.get('verification_steps', []))}"
            raw_docs.append({
                "source": "defensive_playbook",
                "id": pb["playbook_id"],
                "title": pb["name"],
                "content": content,
                "actions": pb["containment_actions"],
                "verification": pb["verification_steps"],
                "raw": pb
            })

        self.documents = raw_docs
        self.total_docs = len(raw_docs)

        # Compute Document Frequencies
        df: Dict[str, int] = defaultdict(int)
        doc_tokens_list: List[List[str]] = []

        for doc in self.documents:
            tokens = self._tokenize_ngrams(doc["content"])
            doc_tokens_list.append(tokens)
            unique_tokens = set(tokens)
            for t in unique_tokens:
                df[t] += 1

        # Compute Smooth IDF: idf = log((N + 1) / (df + 1)) + 1
        for t, freq in df.items():
            self.idf[t] = math.log((self.total_docs + 1) / (freq + 1)) + 1.0

        # Compute L2-normalized TF-IDF vector for each document
        self.doc_vectors = []
        self.doc_norms = []

        for tokens in doc_tokens_list:
            tf = Counter(tokens)
            vec: Dict[str, float] = {}
            norm_sq = 0.0
            for t, count in tf.items():
                w = count * self.idf.get(t, 1.0)
                vec[t] = w
                norm_sq += w * w
            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            self.doc_vectors.append(vec)
            self.doc_norms.append(norm)

    def search(
        self,
        query: str,
        top_k: int = 4,
        source_filter: Optional[str] = None,
        min_similarity: float = 0.05
    ) -> List[Dict[str, Any]]:
        """
        Executes dense cosine similarity search over indexed security knowledge vectors.
        Returns top-k grounded evidence objects.
        """
        query_tokens = self._tokenize_ngrams(query)
        if not query_tokens:
            return []

        # Build Query Vector
        tf = Counter(query_tokens)
        q_vec: Dict[str, float] = {}
        q_norm_sq = 0.0
        for t, count in tf.items():
            w = count * self.idf.get(t, 1.0)
            q_vec[t] = w
            q_norm_sq += w * w

        q_norm = math.sqrt(q_norm_sq)
        if q_norm == 0.0:
            return []

        # Compute Cosine Similarities
        scores: List[Tuple[float, int]] = []
        for idx, (d_vec, d_norm) in enumerate(zip(self.doc_vectors, self.doc_norms)):
            if source_filter and self.documents[idx]["source"] != source_filter:
                continue

            # Dot Product
            dot = 0.0
            # Iterate through smaller vector for optimal speed
            if len(q_vec) < len(d_vec):
                for term, q_val in q_vec.items():
                    if term in d_vec:
                        dot += q_val * d_vec[term]
            else:
                for term, d_val in d_vec.items():
                    if term in q_vec:
                        dot += d_val * q_vec[term]

            sim = dot / (q_norm * d_norm)
            if sim >= min_similarity:
                scores.append((sim, idx))

        # Sort by highest cosine similarity
        scores.sort(key=lambda x: x[0], reverse=True)

        results: List[Dict[str, Any]] = []
        for sim, idx in scores[:top_k]:
            doc = dict(self.documents[idx])
            doc["similarity_score"] = round(sim, 4)
            # Remove bulky raw content before returning
            doc.pop("content", None)
            results.append(doc)

        return results


vector_rag = VectorKnowledgeRetriever()
