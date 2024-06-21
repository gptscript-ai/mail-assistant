package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gptscript-ai/go-gptscript"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type Subscribe struct{}

func (s *Subscribe) Run(cmd *cobra.Command, args []string) error {
	cred := NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(cmd.Context())
	parts := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")
	var recipients []string
	for _, part := range parts {
		recipients = append(recipients, strings.TrimSpace(part))
	}
	h := &handler{
		ctx:        ctx,
		cancel:     cancel,
		client:     client,
		recipients: recipients,
		messages:   map[string]string{},
		lock:       sync.Mutex{},
	}

	go func() {
		http.HandleFunc("/", h.postHandler)

		// Start the server
		port := ":9080"
		fmt.Printf("Starting webhook server on port %s\n", port)
		log.Fatal(http.ListenAndServe(port, nil))
	}()

	requestBody := graphmodels.NewSubscription()
	changeType := "created"
	requestBody.SetChangeType(&changeType)
	notificationUrl := os.Getenv("NGROK_URL")
	requestBody.SetNotificationUrl(&notificationUrl)
	resource := "me/mailFolders('Inbox')/messages"
	requestBody.SetResource(&resource)
	expirationDateTime := time.Now().Add(time.Hour * 24)
	requestBody.SetExpirationDateTime(&expirationDateTime)

	subscription, err := client.Subscriptions().Post(context.Background(), requestBody, nil)
	if err != nil {
		return err
	}

	fmt.Printf("Subscription %v created\n", *subscription.GetCreatorId())

	<-ctx.Done()
	return nil
}

type handler struct {
	ctx context.Context

	cancel context.CancelFunc

	client *msgraphsdk.GraphServiceClient

	recipients []string

	messages map[string]string

	lock sync.Mutex
}

func (h *handler) postHandler(w http.ResponseWriter, r *http.Request) {
	h.lock.Lock()
	defer h.lock.Unlock()
	token := r.URL.Query().Get("validationToken")
	if token != "" {
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(token))
		return
	}

	// Read the body of the POST request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Unable to read request body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	var bodyJson map[string]interface{}
	if err := json.Unmarshal(body, &bodyJson); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, err)
		return
	}

	// Print the body to the console
	values := bodyJson["value"].([]interface{})
	for _, v := range values {
		resourceData := v.(map[string]interface{})["resourceData"].(map[string]interface{})
		messsageID := resourceData["id"].(string)
		message, err := h.client.Me().Messages().ByMessageId(messsageID).Get(h.ctx, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}
		for _, rep := range h.recipients {
			if _, ok := h.messages[rep]; ok {
				continue
			}
			if *message.GetSender().GetEmailAddress().GetAddress() == rep {
				requestBody := graphusers.NewItemMessagesItemReplyPostRequestBody()
				requestBody.SetComment(&[]string{"ACK"}[0])

				if err := h.client.Me().Messages().ByMessageId(messsageID).Reply().Post(h.ctx, requestBody, nil); err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					fmt.Fprint(w, err)
					return
				}
				h.messages[rep] = *message.GetBody().GetContent()
			}
		}
	}

	if len(h.messages) == len(h.recipients) {
		// once we check all the message has been sent from our invitees, we go head and trigger the meeting setup. In real world this is going to run some webhook
		// but for now we are just manually triggering
		stringBuf := strings.Builder{}
		for addr, message := range h.messages {
			stringBuf.WriteString(fmt.Sprintf("User %v has responded with messsage %v\n", addr, message))
		}

		stringBuf.WriteString("Please calculate the available time from both user's schedule. Return time in calculate format. Provide multiple time if possible, separated by ';'. Format: START_TIME,END_TIME;START_TIME,END_TIME")

		gs, err := gptscript.NewGPTScript(gptscript.GlobalOptions{})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}
		defer gs.Close()

		sysPromptIn, err := json.Marshal(struct {
			Message   string `json:"message"`
			Fields    string `json:"fields"`
			Sensitive string `json:"sensitive"`
		}{
			Message:   "Both attendees have responded, you can check their availability now",
			Fields:    "Press enter to continue ...",
			Sensitive: "false",
		})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		run, err := gs.Run(h.ctx, "sys.prompt", gptscript.Options{Input: string(sysPromptIn)})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		_, err = run.Text()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, err)
			return
		}

		h.cancel()
	}

	// Respond to the client
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("POST request received"))
}
