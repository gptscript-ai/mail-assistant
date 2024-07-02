package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"ethan/pkg/mstoken"

	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/spf13/cobra"
)

type SendEmail struct{}

type emailOutput struct {
	MessageID      string `json:"messageId"`
	ConversationID string `json:"conversationId"`
}

func (s *SendEmail) Run(cmd *cobra.Command, args []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	requestBody := graphmodels.NewMessage()
	subject := os.Getenv("EMAIL_SUBJECT")
	requestBody.SetSubject(&subject)
	body := graphmodels.NewItemBody()
	contentType := graphmodels.TEXT_BODYTYPE
	body.SetContentType(&contentType)
	content := os.Getenv("EMAIL_CONTENT")
	body.SetContent(&content)
	requestBody.SetBody(body)

	var toRecipients []graphmodels.Recipientable
	for _, r := range strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",") {
		emailAddress := strings.TrimSpace(r)
		rep := graphmodels.NewRecipient()
		addr := graphmodels.NewEmailAddress()
		addr.SetAddress(&emailAddress)
		rep.SetEmailAddress(addr)

		toRecipients = append(toRecipients, rep)
	}

	requestBody.SetToRecipients(toRecipients)

	message, err := client.Me().Messages().Post(cmd.Context(), requestBody, nil)
	if err != nil {
		return err
	}

	if err := client.Me().Messages().ByMessageId(*message.GetId()).Send().Post(cmd.Context(), nil); err != nil {
		return err
	}

	o := emailOutput{
		MessageID:      *message.GetId(),
		ConversationID: *message.GetConversationId(),
	}

	data, err := json.Marshal(o)
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}
