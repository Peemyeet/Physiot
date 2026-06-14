// Physiot Schedule API — a small stdlib-only HTTP server that stores the
// department's monthly schedule (classes + tasks) in a JSON file on disk.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
)

type Task struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Due    string `json:"due"`
	Done   bool   `json:"done"`
}

type ClassItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Day      string `json:"day"`
	Type     string `json:"type"`
	Start    string `json:"start"`
	End      string `json:"end"`
	Location string `json:"location"`
	Note     string `json:"note"`
	Tasks    []Task `json:"tasks"`
}

type MonthData struct {
	Classes []ClassItem `json:"classes"`
}

type Store struct {
	mu     sync.Mutex
	file   string
	Months map[string]*MonthData `json:"months"`
}

func newStore(file string) *Store {
	s := &Store{file: file, Months: map[string]*MonthData{}}
	if b, err := os.ReadFile(file); err == nil {
		_ = json.Unmarshal(b, s)
	}
	if s.Months == nil {
		s.Months = map[string]*MonthData{}
	}
	return s
}

func (s *Store) persist() {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		log.Println("marshal:", err)
		return
	}
	if err := os.WriteFile(s.file, b, 0o644); err != nil {
		log.Println("write:", err)
	}
}

func (s *Store) month(key string) *MonthData {
	m, ok := s.Months[key]
	if !ok {
		m = &MonthData{Classes: []ClassItem{}}
		s.Months[key] = m
	}
	return m
}

func (s *Store) getMonth(key string) MonthData {
	s.mu.Lock()
	defer s.mu.Unlock()
	return *s.month(key)
}

func (s *Store) upsertClass(key string, c ClassItem) MonthData {
	s.mu.Lock()
	defer s.mu.Unlock()
	m := s.month(key)
	found := false
	for i := range m.Classes {
		if m.Classes[i].ID == c.ID {
			m.Classes[i] = c
			found = true
			break
		}
	}
	if !found {
		m.Classes = append(m.Classes, c)
	}
	s.persist()
	return *m
}

func (s *Store) deleteClass(key, id string) MonthData {
	s.mu.Lock()
	defer s.mu.Unlock()
	m := s.month(key)
	out := m.Classes[:0]
	for _, c := range m.Classes {
		if c.ID != id {
			out = append(out, c)
		}
	}
	m.Classes = out
	s.persist()
	return *m
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	dataFile := os.Getenv("DATA_FILE")
	if dataFile == "" {
		dataFile = "data.json"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	store := newStore(dataFile)
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/months/{key}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.getMonth(r.PathValue("key")))
	})

	mux.HandleFunc("PUT /api/months/{key}/classes", func(w http.ResponseWriter, r *http.Request) {
		var c ClassItem
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		if c.Tasks == nil {
			c.Tasks = []Task{}
		}
		writeJSON(w, http.StatusOK, store.upsertClass(r.PathValue("key"), c))
	})

	mux.HandleFunc("DELETE /api/months/{key}/classes/{id}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.deleteClass(r.PathValue("key"), r.PathValue("id")))
	})

	log.Printf("Physiot API listening on http://localhost:%s (data: %s)", port, dataFile)
	if err := http.ListenAndServe(":"+port, cors(mux)); err != nil {
		log.Fatal(err)
	}
}
