package cmd

import (
	"fmt"
	"os"
	"strings"
	"time"

	"ethan/pkg/mstoken"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/spf13/cobra"
)

type CheckSchedule struct {
}

func (c *CheckSchedule) Run(cmd *cobra.Command, _ []string) error {
	cred := mstoken.NewStaticTokenCredential(os.Getenv("GPTSCRIPT_GRAPH_MICROSOFT_COM_BEARER_TOKEN"))
	client, err := msgraphsdk.NewGraphServiceClientWithCredentials(cred, []string{})
	if err != nil {
		return err
	}

	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.body-content-type=text,outlook.timezone=\"Pacific Standard Time\"")
	emailRecipients := strings.Split(os.Getenv("EMAIL_RECIPIENT"), ",")
	conversationID := os.Getenv("CONVERSATION_ID")

	ret := strings.Builder{}
	// First, find if they have replied to the original email
	for _, recipient := range emailRecipients {
		rep := strings.TrimSpace(recipient)
		configuration := &graphusers.ItemMessagesRequestBuilderGetRequestConfiguration{
			Headers: headers,
		}
		messages, err := client.Me().Messages().Get(cmd.Context(), configuration)
		if err != nil {
			return err
		}
		for _, m := range messages.GetValue() {
			if *m.GetConversationId() != conversationID {
				continue
			}
			if *m.GetSender().GetEmailAddress().GetAddress() != rep {
				continue
			}
			ret.WriteString(rep)
			ret.WriteString("\n")
			ret.WriteString(*m.GetBody().GetContent())
			ret.WriteString("\n")
		}
	}

	// Then, if they didn't reply, possibly check their schedule on O365 API
	if ret.String() == "" {
		for _, recipient := range emailRecipients {
			configuration := &graphusers.ItemCalendarGetscheduleGetScheduleRequestBuilderPostRequestConfiguration{
				Headers: headers,
			}
			requestBody := graphusers.NewItemCalendarGetscheduleGetSchedulePostRequestBody()

			requestBody.SetSchedules([]string{
				recipient,
			})
			start := time.Now().Format(time.RFC3339)
			end := time.Now().AddDate(0, 0, 7).Format(time.RFC3339)
			startTime := graphmodels.NewDateTimeTimeZone()
			startTime.SetDateTime(&start)
			timeZone := "Pacific Standard Time"
			startTime.SetTimeZone(&timeZone)
			requestBody.SetStartTime(startTime)
			endTime := graphmodels.NewDateTimeTimeZone()
			endTime.SetDateTime(&end)
			endTime.SetTimeZone(&timeZone)
			requestBody.SetEndTime(endTime)
			availabilityViewInterval := int32(60)
			requestBody.SetAvailabilityViewInterval(&availabilityViewInterval)

			schedules, err := client.Me().Calendar().GetSchedule().PostAsGetSchedulePostResponse(cmd.Context(), requestBody, configuration)
			if err != nil {
				return err
			}
			for _, s := range schedules.GetValue() {
				for _, item := range s.GetScheduleItems() {
					start := item.GetStart()
					start.SetTimeZone(&timeZone)
					end := item.GetEnd()
					end.SetTimeZone(&timeZone)
					var subject string
					if item.GetSubject() != nil {
						subject = *item.GetSubject()
					}
					if item.GetStatus() != nil && (*item.GetStatus() == graphmodels.BUSY_FREEBUSYSTATUS || *item.GetStatus() == graphmodels.OOF_FREEBUSYSTATUS || *item.GetStatus() == graphmodels.TENTATIVE_FREEBUSYSTATUS) {
						ret.WriteString(fmt.Sprintf("Email address: %v, Status: Busy, start: %v, end: %v, timezone: %v, subject: %v\n", recipient, *start.GetDateTime(), *end.GetDateTime(), *start.GetTimeZone(), subject))
					}
				}
			}
		}
	}

	fmt.Println(ret.String())
	return nil
}
