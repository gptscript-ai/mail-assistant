package cmd

import (
	"os"
	"strings"

	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type SendEmail struct{}

func (s *SendEmail) Run(cmd *cobra.Command, args []string) error {
	cred := NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	requestBody := graphusers.NewItemSendmailSendMailPostRequestBody()
	message := graphmodels.NewMessage()
	subject := os.Getenv("EMAIL_SUBJECT")
	message.SetSubject(&subject)
	body := graphmodels.NewItemBody()
	contentType := graphmodels.TEXT_BODYTYPE
	body.SetContentType(&contentType)
	content := os.Getenv("EMAIL_CONTENT")
	body.SetContent(&content)
	message.SetBody(body)

	var toRecipients []graphmodels.Recipientable
	for _, r := range strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",") {
		emailAddress := strings.TrimSpace(r)
		rep := graphmodels.NewRecipient()
		addr := graphmodels.NewEmailAddress()
		addr.SetAddress(&emailAddress)
		rep.SetEmailAddress(addr)

		toRecipients = append(toRecipients, rep)
	}

	message.SetToRecipients(toRecipients)
	requestBody.SetMessage(message)
	saveToSentItems := true
	requestBody.SetSaveToSentItems(&saveToSentItems)

	if err := client.Me().SendMail().Post(cmd.Context(), requestBody, nil); err != nil {
		return err
	}
	return nil
}
