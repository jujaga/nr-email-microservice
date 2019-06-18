---
title: Messaging Service Developer Guide
description: Capabilities, OAuth Security, API Endpoints, Example Code
---  

The Common Messaging service is an API for sending messages to a specified users via SMTP and SMS. The Common Messaging service (CMSG) can be accessed programmatically via the CMSG-MESSAGING-API. A description of the API can be found in [NRM API Store](https://apistore.nrs.gov.bc.ca/store/apis/info?name=cmsg-messaging-api&version=v1&provider=admin).  

The CMSG-MESSAGING-API is secured using OAuth2 security. Anonymous access to the CMSG-MESSAGING-API is not permitted. Users of the CMSG-MESSAGING-API must have one of more of the OAuth2 scopes for CMSG in order to access the CMSG via the API.  

The messaging service implements a REST API to Oracle’s User Messaging Service, part of the Oracle Fusion Middleware stack. The CMSG-MESSAGING-API can be used for sending SMTP based mail and SMS messages to internal and external users. The Oracle software provides the capability to delay the sending of messages and check message status. Guaranteed delivery is an option of this service.  

## Capabilities  

Initially the Common Messaging API supported only plaintext content. The API has since been modified to support HTML content. The value of mediaType in the request should be text/html to render HTML content in the email. Support is also provided for adding attachments to the message. However, only PDF content is supported at the present time.  

Sending SMS content via the CMSG-MESSAGING-API is not currently implemented. Timed release of email and guaranteed delivery are also not currently implemented via the API.  

## Security  


Before developing applications that use the CMSG-MESSAGING-API, ensure that you have a WebADE service client that is authorized to use the CMSG-MESSAGING-API. In addition, ensure that the required scopes have been granted in order to request services from the CMSG-MESSAGING-API endpoints.  

The OAuth2 scopes available for cmsg-api are:  

-   CREATE_MESSAGE  
-   GET_STATUSES  
-   GET_TOPLEVEL  

## API Endpoints  
> Version 1.1 of the CMSG-MESSAGING-API support the following endpoints:  

-   /messages/status – Get a listof message statuses  
-   /messages – send a message  
-   /\* - get top-level resources  
-   /checkHealth – query the health of the service  

### Example: Calling the CMSG-MESSAGING-API from Java
> Package Name: ca.bc.gov.nrs.cmsg.api.rest.client.v1.impl  

```
private void sendEmail( String subject, String message, List<String> recipients )
    {
        EmailMessageResource emailMessage = new EmailMessageResource();
        String sender = DEFAULT_SENDER;
        emailMessage.setSender(sender);
        emailMessage.getRecipients().addAll(recipients);
        emailMessage.setSubject(subject);
        emailMessage.setMediaType("text/plain");
        emailMessage.setMessage(message);
        logger.debug("Send e-mail from "+ emailMessage.getSender() + " to " + emailMessage.getRecipients() + "\\nsubject " + emailMessage.getSubject() + "\\nmessage " + emailMessage.getMessage());

// Read file contents and add to Attachment 
        List<ca.bc.gov.nrs.cmsg.model.v1.Attachment> attachments = new ArrayList<>();
        String fileName = "validPdfFile.pdf";
        java.nio.file.Path filePath = java.nio.file.Paths.get(fileName);
        byte[] buffer = java.nio.file.Files.readAllBytes(filePath);
        ca.bc.gov.nrs.cmsg.model.v1.Attachment attachment = new Attachment();

// Convert file contents to a Base64 encodeded string
        String base64EncodedContent = new String(
                org.apache.commons.codec.binary.Base64.encodeBase64(buffer));
        attachment.setContent(base64EncodedContent);
        attachment.setName(fileName);
        attachment.setFileType("pdf");
        attachments.add(attachment);

// adding attachment to emailMessage
        emailMessage.setAttachments(attachments);
         try {
            messagingService.sendMessage(emailMessage);
        } catch (MessagingServiceException e) {
            throw new ServiceException("Common Messaging API threw an exception: " + e.getMessage(), e);
        } catch (ca.bc.gov.nrs.cmsg.api.rest.client.v1.ValidationException e) {
            throw new BadRequestException(
                    "Common Messaging API threw a validation exception while sending an email: " + e.getMessage(), e);
        }
    }
```  
