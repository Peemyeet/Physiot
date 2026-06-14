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

type SharedTask struct {
	ID            string          `json:"id"`
	ClassID       string          `json:"classId"`
	CourseName    string          `json:"courseName"`
	Title         string          `json:"title"`
	Detail        string          `json:"detail"`
	Due           string          `json:"due"`
	CreatedBy     string          `json:"createdBy"`
	CreatedByName string          `json:"createdByName"`
	CreatedAt     string          `json:"createdAt"`
	DoneBy        map[string]bool `json:"doneBy"`
}

type Store struct {
	mu          sync.Mutex
	file        string
	Months      map[string]*MonthData `json:"months"`
	SharedTasks []SharedTask          `json:"sharedTasks"`
}

func newStore(file string) *Store {
	s := &Store{file: file, Months: map[string]*MonthData{}}
	if b, err := os.ReadFile(file); err == nil {
		_ = json.Unmarshal(b, s)
	}
	if s.Months == nil {
		s.Months = map[string]*MonthData{}
	}
	if s.SharedTasks == nil {
		s.SharedTasks = []SharedTask{}
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

func (s *Store) getSharedTasks() []SharedTask {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]SharedTask, len(s.SharedTasks))
	copy(out, s.SharedTasks)
	return out
}

func (s *Store) addSharedTask(t SharedTask) []SharedTask {
	s.mu.Lock()
	defer s.mu.Unlock()
	if t.DoneBy == nil {
		t.DoneBy = map[string]bool{}
	}
	s.SharedTasks = append(s.SharedTasks, t)
	s.persist()
	out := make([]SharedTask, len(s.SharedTasks))
	copy(out, s.SharedTasks)
	return out
}

func (s *Store) toggleSharedTask(id, userId string, done bool) []SharedTask {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.SharedTasks {
		if s.SharedTasks[i].ID == id {
			if s.SharedTasks[i].DoneBy == nil {
				s.SharedTasks[i].DoneBy = map[string]bool{}
			}
			s.SharedTasks[i].DoneBy[userId] = done
			break
		}
	}
	s.persist()
	out := make([]SharedTask, len(s.SharedTasks))
	copy(out, s.SharedTasks)
	return out
}

func (s *Store) deleteSharedTask(id string) []SharedTask {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.SharedTasks[:0]
	for _, t := range s.SharedTasks {
		if t.ID != id {
			out = append(out, t)
		}
	}
	s.SharedTasks = out
	s.persist()
	result := make([]SharedTask, len(s.SharedTasks))
	copy(result, s.SharedTasks)
	return result
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS")
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

	// Per-user term storage (key = userId/termKey)
	mux.HandleFunc("GET /api/users/{userId}/term/{termKey}", func(w http.ResponseWriter, r *http.Request) {
		key := r.PathValue("userId") + "/" + r.PathValue("termKey")
		writeJSON(w, http.StatusOK, store.getMonth(key))
	})

	mux.HandleFunc("PUT /api/users/{userId}/term/{termKey}/classes", func(w http.ResponseWriter, r *http.Request) {
		var c ClassItem
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		if c.Tasks == nil {
			c.Tasks = []Task{}
		}
		key := r.PathValue("userId") + "/" + r.PathValue("termKey")
		writeJSON(w, http.StatusOK, store.upsertClass(key, c))
	})

	mux.HandleFunc("DELETE /api/users/{userId}/term/{termKey}/classes/{id}", func(w http.ResponseWriter, r *http.Request) {
		key := r.PathValue("userId") + "/" + r.PathValue("termKey")
		writeJSON(w, http.StatusOK, store.deleteClass(key, r.PathValue("id")))
	})

	mux.HandleFunc("GET /api/shared/tasks", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.getSharedTasks())
	})

	mux.HandleFunc("POST /api/shared/tasks", func(w http.ResponseWriter, r *http.Request) {
		var t SharedTask
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		writeJSON(w, http.StatusOK, store.addSharedTask(t))
	})

	mux.HandleFunc("PATCH /api/shared/tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			UserID string `json:"userId"`
			Done   bool   `json:"done"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		writeJSON(w, http.StatusOK, store.toggleSharedTask(r.PathValue("id"), body.UserID, body.Done))
	})

	mux.HandleFunc("DELETE /api/shared/tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.deleteSharedTask(r.PathValue("id")))
	})

	log.Printf("Physiot API listening on http://localhost:%s (data: %s)", port, dataFile)
	if err := http.ListenAndServe(":"+port, cors(mux)); err != nil {
		log.Fatal(err)
	}
}
