package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	"github.com/spf13/cobra"
)

type Schedule struct{}

func (s *Schedule) Run(cmd *cobra.Command, _ []string) error {
	cred := NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	me, err := client.Me().Get(cmd.Context(), nil)
	if err != nil {
		return err
	}

	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.timezone=\"Pacific Standard Time\"")

	eventRequestBody := graphmodels.NewEvent()
	subject := os.Getenv("EVENT_SUBJECT")
	eventRequestBody.SetSubject(&subject)
	body := graphmodels.NewItemBody()
	contentType := graphmodels.HTML_BODYTYPE
	body.SetContentType(&contentType)
	content := os.Getenv("EVENT_CONTENT")
	body.SetContent(&content)
	eventRequestBody.SetBody(body)
	start := graphmodels.NewDateTimeTimeZone()
	startTime := os.Getenv("START_TIME")
	endTime := os.Getenv("END_TIME")
	timeZone := "Pacific Standard Time"
	start.SetDateTime(&startTime)
	start.SetTimeZone(&timeZone)
	eventRequestBody.SetStart(start)
	end := graphmodels.NewDateTimeTimeZone()
	end.SetDateTime(&endTime)
	end.SetTimeZone(&timeZone)
	eventRequestBody.SetEnd(end)

	var attendees []graphmodels.Attendeeable
	for _, addr := range strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",") {
		email := strings.TrimSpace(addr)
		attendee := graphmodels.NewAttendee()
		emailAddress := graphmodels.NewEmailAddress()
		emailAddress.SetAddress(&email)
		attendee.SetEmailAddress(emailAddress)
		attendees = append(attendees, attendee)
	}

	attendee := graphmodels.NewAttendee()
	emailAddress := graphmodels.NewEmailAddress()
	emailAddress.SetAddress(me.GetMail())
	attendee.SetEmailAddress(emailAddress)
	attendees = append(attendees, attendee)

	eventRequestBody.SetAttendees(attendees)

	event, err := client.Me().Calendar().Events().Post(context.Background(), eventRequestBody, nil)
	if err != nil {
		return err
	}
	fmt.Printf("Event subject: %v\n", *event.GetSubject())
	fmt.Printf("Event start time: %v\n", *event.GetStart().GetDateTime())
	fmt.Printf("Event end time: %v\n", *event.GetEnd().GetDateTime())
	for _, attendee := range event.GetAttendees() {
		fmt.Printf("Event attende email address: %v\n", *attendee.GetEmailAddress().GetAddress())
	}
	fmt.Printf("Event organizer: %v\n", *event.GetOrganizer().GetEmailAddress().GetName())

	return nil
}
