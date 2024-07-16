package main

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	token, _ := createJWT()
	fmt.Println(token)
}

func createJWT() (string, error) {
	claims := jwt.MapClaims{
		"sub":   "5b67d230-9a27-4fea-90ec-dd514342c0af",
		"name":  "Will Chan",
		"email": "will@acorn.io",
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(""))
}


