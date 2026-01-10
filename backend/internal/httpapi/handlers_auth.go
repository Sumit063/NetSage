package httpapi

import (
    "net/http"
    "strings"

    "netsage/internal/auth"
    "netsage/internal/db"
)

type authRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type authResponse struct {
    Token string `json:"token"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
    var req authRequest
    if err := decodeJSON(r, &req); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
        return
    }

    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    if req.Email == "" || len(req.Password) < 8 {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid email or password"})
        return
    }

    hash, err := auth.HashPassword(req.Password)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "hash failed"})
        return
    }

    user := db.User{Email: req.Email, PasswordHash: hash}
    if err := s.store.DB.Create(&user).Error; err != nil {
        writeJSON(w, http.StatusConflict, map[string]string{"error": "email already exists"})
        return
    }

    token, err := s.tokenMgr.GenerateToken(user.ID, user.Email)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token failed"})
        return
    }

    writeJSON(w, http.StatusOK, authResponse{Token: token})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
    var req authRequest
    if err := decodeJSON(r, &req); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
        return
    }

    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    if req.Email == "" || req.Password == "" {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid email or password"})
        return
    }

    var user db.User
    if err := s.store.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
        return
    }

    if !auth.CheckPassword(req.Password, user.PasswordHash) {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
        return
    }

    token, err := s.tokenMgr.GenerateToken(user.ID, user.Email)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token failed"})
        return
    }

    writeJSON(w, http.StatusOK, authResponse{Token: token})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
    user, ok := getUser(r.Context())
    if !ok {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
        return
    }

    writeJSON(w, http.StatusOK, map[string]interface{}{
        "id":    user.ID,
        "email": user.Email,
    })
}
