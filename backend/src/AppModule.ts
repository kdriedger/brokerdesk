import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { AppController } from "./AppController";
import { WorkspaceController } from "./controllers/WorkspaceController";
import { RequestContextMiddleware } from "./middleware/RequestContextMiddleware";

import { BrokerDeskActorsAdminAuthController } from "./controllers/actors/AdminAuthController";
import { BrokerDeskActorsAdminClientsController } from "./controllers/actors/AdminClientsController";
import { BrokerDeskActorsAdminCsrsController } from "./controllers/actors/AdminCsrsController";
import { BrokerDeskActorsAdminProducerLicencesController } from "./controllers/actors/AdminProducerLicencesController";
import { BrokerDeskActorsAdminProducersController } from "./controllers/actors/AdminProducersController";
import { BrokerDeskActorsAdminsController } from "./controllers/actors/AdminsController";
import { BrokerDeskActorsClientAuthController } from "./controllers/actors/ClientAuthController";
import { BrokerDeskActorsClientMeController } from "./controllers/actors/ClientMeController";
import { BrokerDeskActorsCsrAuthController } from "./controllers/actors/CsrAuthController";
import { BrokerDeskActorsCsrMeController } from "./controllers/actors/CsrMeController";
import { BrokerDeskActorsGuestAuthController } from "./controllers/actors/GuestAuthController";
import { BrokerDeskActorsProducerAuthController } from "./controllers/actors/ProducerAuthController";
import { BrokerDeskActorsProducerMeController } from "./controllers/actors/ProducerMeController";
import { BrokerDeskBillingCommissionController } from "./controllers/billing/CommissionController";
import { BrokerDeskBillingCommissionStatementController } from "./controllers/billing/CommissionStatementController";
import { BrokerDeskBillingDashboardController } from "./controllers/billing/DashboardController";
import { BrokerDeskBillingInvoiceController } from "./controllers/billing/InvoiceController";
import { BrokerDeskBillingPaymentController } from "./controllers/billing/PaymentController";
import { BrokerDeskCatalogueCarrierAppointmentController } from "./controllers/catalogue/CarrierController";
import { BrokerDeskCatalogueCarrierController } from "./controllers/catalogue/CarrierController";
import { BrokerDeskCatalogueCommissionScheduleController } from "./controllers/catalogue/CommissionScheduleController";
import { BrokerDeskCatalogueCoverageItemController } from "./controllers/catalogue/CoverageItemController";
import { BrokerDeskCatalogueProductController } from "./controllers/catalogue/ProductController";
import { BrokerDeskCrmActivityController } from "./controllers/crm/ActivityController";
import { BrokerDeskCrmClientAddressController } from "./controllers/crm/AddressController";
import { BrokerDeskCrmClientContactController } from "./controllers/crm/ClientContactController";
import { BrokerDeskCrmClientController } from "./controllers/crm/ClientController";
import { BrokerDeskCrmOrganizationAddressController } from "./controllers/crm/OrganizationAddressController";
import { BrokerDeskCrmTaskController } from "./controllers/crm/TaskController";
import { BrokerDeskDocumentController } from "./controllers/document/DocumentController";
import { BrokerDeskDocumentTemplateController } from "./controllers/document/DocumentTemplateController";
import { BrokerDeskDocumentVersionController } from "./controllers/document/DocumentVersionController";
import { BrokerDeskPolicyDocumentController } from "./controllers/policy/PolicyDocumentController";
import { BrokerDeskPolicyEndorsementController } from "./controllers/policy/PolicyEndorsementController";
import { BrokerDeskPolicyPolicyController } from "./controllers/policy/PolicyController";
import { BrokerDeskPolicyRenewalController } from "./controllers/policy/PolicyRenewalController";
import { BrokerDeskPolicySubsidiaryController } from "./controllers/policy/PolicySubsidiaryController";
import { BrokerDeskQuotingQuoteController } from "./controllers/quoting/QuoteController";
import { BrokerDeskQuotingQuoteLineController } from "./controllers/quoting/QuoteLineController";
import { BrokerDeskQuotingSubmissionController } from "./controllers/quoting/SubmissionController";
import { BrokerDeskQuotingSubmissionMessageController } from "./controllers/quoting/SubmissionMessageController";
import { BrokerDeskSystematicAuditLogController } from "./controllers/systematic/AuditLogController";
import { BrokerDeskSystematicNotificationController } from "./controllers/systematic/NotificationController";
import { BrokerDeskSystematicOrganizationController } from "./controllers/systematic/OrganizationController";

@Module({
  controllers: [
    AppController,
    WorkspaceController,
    BrokerDeskActorsAdminAuthController,
    BrokerDeskActorsAdminClientsController,
    BrokerDeskActorsAdminCsrsController,
    BrokerDeskActorsAdminProducerLicencesController,
    BrokerDeskActorsAdminProducersController,
    BrokerDeskActorsAdminsController,
    BrokerDeskActorsClientAuthController,
    BrokerDeskActorsClientMeController,
    BrokerDeskActorsCsrAuthController,
    BrokerDeskActorsCsrMeController,
    BrokerDeskActorsGuestAuthController,
    BrokerDeskActorsProducerAuthController,
    BrokerDeskActorsProducerMeController,
    BrokerDeskBillingCommissionController,
    BrokerDeskBillingCommissionStatementController,
    BrokerDeskBillingDashboardController,
    BrokerDeskBillingInvoiceController,
    BrokerDeskBillingPaymentController,
    BrokerDeskCatalogueCarrierAppointmentController,
    BrokerDeskCatalogueCarrierController,
    BrokerDeskCatalogueCommissionScheduleController,
    BrokerDeskCatalogueCoverageItemController,
    BrokerDeskCatalogueProductController,
    BrokerDeskCrmActivityController,
    BrokerDeskCrmClientAddressController,
    BrokerDeskCrmClientContactController,
    BrokerDeskCrmClientController,
    BrokerDeskCrmOrganizationAddressController,
    BrokerDeskCrmTaskController,
    BrokerDeskDocumentController,
    BrokerDeskDocumentTemplateController,
    BrokerDeskDocumentVersionController,
    BrokerDeskPolicyDocumentController,
    BrokerDeskPolicyEndorsementController,
    BrokerDeskPolicyPolicyController,
    BrokerDeskPolicyRenewalController,
    BrokerDeskPolicySubsidiaryController,
    BrokerDeskQuotingQuoteController,
    BrokerDeskQuotingQuoteLineController,
    BrokerDeskQuotingSubmissionController,
    BrokerDeskQuotingSubmissionMessageController,
    BrokerDeskSystematicAuditLogController,
    BrokerDeskSystematicNotificationController,
    BrokerDeskSystematicOrganizationController,
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
