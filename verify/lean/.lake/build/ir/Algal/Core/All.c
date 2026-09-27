// Lean compiler output
// Module: Algal.Core.All
// Imports: public import Init public meta import Init public import Algal.Core.Binary64 public import Algal.Core.BinaryValue public import Algal.Core.NumericInjectivity public import Algal.Core.RoundingInterval public import Algal.Core.SignedRounding public import Algal.Core.RoundingEndpoints public import Algal.Core.NegativeEndpoints public import Algal.Core.FiniteNeighbors public import Algal.Core.IntervalSearch public import Algal.Core.RationalBracket public import Algal.Core.RationalSelector public import Algal.Core.DecimalSyntax public import Algal.Core.Text public import Algal.Core.JsonString public import Algal.Core.ByteFraming public import Algal.Core.OwnMap public import Algal.Core.KeyOrder public import Algal.Core.Json public import Algal.Core.Normalize public import Algal.Core.JsonLayout public import Algal.Core.Ports public import Algal.Core.Graph public import Algal.Core.Accounting public import Algal.Core.Oracle
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_BinaryValue(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_NumericInjectivity(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RoundingInterval(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_SignedRounding(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RoundingEndpoints(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_NegativeEndpoints(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_FiniteNeighbors(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_IntervalSearch(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RationalBracket(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RationalSelector(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_DecimalSyntax(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Text(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_JsonString(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_ByteFraming(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_KeyOrder(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Normalize(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_JsonLayout(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Ports(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Graph(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Accounting(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Oracle(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_All(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Binary64(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_BinaryValue(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_NumericInjectivity(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_RoundingInterval(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_SignedRounding(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_RoundingEndpoints(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_NegativeEndpoints(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_FiniteNeighbors(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_IntervalSearch(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_RationalBracket(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_RationalSelector(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_DecimalSyntax(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Text(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_JsonString(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_ByteFraming(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_OwnMap(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_KeyOrder(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Json(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Normalize(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_JsonLayout(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Ports(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Graph(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Accounting(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Oracle(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
