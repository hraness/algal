// Lean compiler output
// Module: Algal.Replay.Model
// Imports: public import Init public meta import Init public import Algal.Core.Json public import Algal.Core.OwnMap
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
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* l_Repr_addAppParen(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lean_nat_to_int(lean_object*);
lean_object* lean_string_length(lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lean_mk_empty_array_with_capacity(lean_object*);
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqProd___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* lean_array_to_list(lean_object*);
lean_object* lean_array_get_size(lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lean_array_push(lean_object*, lean_object*);
lean_object* l_Nat_reprFast(lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* l_String_quote(lean_object*);
lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint8_t l_List_isEmpty___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Kind_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqKind(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqKind___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Replay.Kind.agent"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Replay.Kind.classifier"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Replay.Kind.gate"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 25, .m_capacity = 25, .m_length = 24, .m_data = "Algal.Replay.Kind.decide"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 25, .m_capacity = 25, .m_length = 24, .m_data = "Algal.Replay.Kind.recall"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Replay.Kind.tool"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprKind_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__11_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprKind___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprKind_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprKind___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprKind = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprKind___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqKind_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqKind_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqKind___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqKind_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqKind___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqKind___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqKind = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqKind___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_ErrorCode_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqErrorCode(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 37, .m_capacity = 37, .m_length = 36, .m_data = "Algal.Replay.ErrorCode.effectUnbound"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 36, .m_capacity = 36, .m_length = 35, .m_data = "Algal.Replay.ErrorCode.effectFailed"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 41, .m_capacity = 41, .m_length = 40, .m_data = "Algal.Replay.ErrorCode.effectUnparseable"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 36, .m_capacity = 36, .m_length = 35, .m_data = "Algal.Replay.ErrorCode.inputMissing"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 33, .m_capacity = 33, .m_length = 32, .m_data = "Algal.Replay.ErrorCode.storeMiss"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 39, .m_capacity = 39, .m_length = 38, .m_data = "Algal.Replay.ErrorCode.budgetExhausted"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 38, .m_capacity = 38, .m_length = 37, .m_data = "Algal.Replay.ErrorCode.digestMismatch"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__13_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 39, .m_capacity = 39, .m_length = 38, .m_data = "Algal.Replay.ErrorCode.receiptMismatch"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__14_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__15_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 35, .m_capacity = 35, .m_length = 34, .m_data = "Algal.Replay.ErrorCode.toolUnknown"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__16_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__17_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 35, .m_capacity = 35, .m_length = 34, .m_data = "Algal.Replay.ErrorCode.parseFailed"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__18 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__18_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__18_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__19_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 36, .m_capacity = 36, .m_length = 35, .m_data = "Algal.Replay.ErrorCode.typeMismatch"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__20 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__20_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__20_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__21 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__21_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 32, .m_capacity = 32, .m_length = 31, .m_data = "Algal.Replay.ErrorCode.internal"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__22 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__22_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__22_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__23 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__23_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprErrorCode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprErrorCode_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprErrorCode___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqErrorCode_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqErrorCode_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqErrorCode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqErrorCode_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqErrorCode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqErrorCode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqErrorCode = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqErrorCode___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_output_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_output_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_failure_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_failure_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_suspended_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_suspended_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReply(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReply___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMeta(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMeta___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRequest(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRequest___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serve(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serve___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_serves(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serves___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_occurrences(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_occurrences___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_dropSuspended_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_dropSuspended(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noLive(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noLive___boxed(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_unboundRecord___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 1}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Replay_unboundRecord___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_unboundRecord___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Replay_unboundRecord___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "unbound"};
static const lean_object* lp_algalVerification_Algal_Replay_unboundRecord___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_unboundRecord___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_unboundRecord___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*4 + 8, .m_other = 4, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_unboundRecord___closed__1_value),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Replay_unboundRecord___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_unboundRecord___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_unboundRecord(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noRecordedSlots(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noRecordedSlots___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_dispatch(lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_resolveSlotRead___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 1}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(3, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Replay_resolveSlotRead___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_resolveSlotRead___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resolveSlotRead(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resolveSlotRead___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_SlotMode_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSlotMode(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSlotMode___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Replay.SlotMode.read"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Replay.SlotMode.write"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__3_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprSlotMode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprSlotMode_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprSlotMode___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqSlotMode_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqSlotMode_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqSlotMode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqSlotMode_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqSlotMode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqSlotMode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqSlotMode = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqSlotMode___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_CellStatus_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellStatus(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellStatus___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 34, .m_capacity = 34, .m_length = 33, .m_data = "Algal.Replay.CellStatus.committed"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 32, .m_capacity = 32, .m_length = 31, .m_data = "Algal.Replay.CellStatus.skipped"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 31, .m_capacity = 31, .m_length = 30, .m_data = "Algal.Replay.CellStatus.failed"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 34, .m_capacity = 34, .m_length = 33, .m_data = "Algal.Replay.CellStatus.suspended"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__7_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprCellStatus___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprCellStatus_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprCellStatus___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqCellStatus_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqCellStatus_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqCellStatus___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqCellStatus_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqCellStatus___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqCellStatus___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqCellStatus = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqCellStatus___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0_value;
static const lean_closure_object lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__1_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Outcome_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqOutcome(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqOutcome___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Outcome.complete"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Replay.Outcome.failed"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Replay.Outcome.stuck"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 31, .m_capacity = 31, .m_length = 30, .m_data = "Algal.Replay.Outcome.suspended"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__7_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprOutcome___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprOutcome_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprOutcome = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprOutcome___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqOutcome_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqOutcome_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqOutcome___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqOutcome_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqOutcome___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqOutcome___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqOutcome = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqOutcome___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_request_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_request_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_readSlot_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_readSlot_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_writeSlot_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_writeSlot_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_done_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_done_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqDirective(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqDirective___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1___boxed(lean_object*, lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*1, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1___boxed, .m_arity = 3, .m_num_fixed = 1, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0_value)} };
static const lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_done_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_done_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_suspendedEnd_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_suspendedEnd_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_exhausted_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_exhausted_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEndMarker(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEndMarker___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "none"};
static const lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__0 = (const lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__0_value;
static const lean_ctor_object lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__0_value)}};
static const lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__1 = (const lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__1_value;
static const lean_string_object lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "some "};
static const lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__2 = (const lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__2_value;
static const lean_ctor_object lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__2_value)}};
static const lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__3 = (const lean_object*)&lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__3_value;
LEAN_EXPORT lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 36, .m_capacity = 36, .m_length = 35, .m_data = "Algal.Replay.EndMarker.suspendedEnd"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 33, .m_capacity = 33, .m_length = 32, .m_data = "Algal.Replay.EndMarker.exhausted"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Replay.EndMarker.done"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__5_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__6_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprEndMarker___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprEndMarker_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEndMarker___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqEndMarker_beq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqEndMarker_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqEndMarker___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqEndMarker_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqEndMarker___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqEndMarker___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqEndMarker = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqEndMarker___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_steps(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0___boxed(lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_closureSatisfied(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_closureSatisfied___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_run___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_run___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_run___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_run(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_outcomeOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_outcomeOf___boxed(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_failureOf___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(5) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_failureOf___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_failureOf___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_failureOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_failureOf___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqStamp(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqStamp___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "{ "};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "name"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = " := "};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = ","};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "version"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__11_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = " }"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__13_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__13_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__17_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprStamp___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprStamp_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprStamp___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprStamp = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqStamp_beq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqStamp_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqStamp___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqStamp_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqStamp___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqStamp___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqStamp = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqStamp___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqWork(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqWork___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "steps"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__2_value),((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__3_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 11, .m_capacity = 11, .m_length = 10, .m_data = "agentCalls"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "units"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__9_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprWork___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprWork_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprWork___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprWork = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprWork___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqWork_beq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqWork_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqWork___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqWork_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqWork___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqWork___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqWork = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqWork___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_EventKind_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEventKind(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEventKind___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 32, .m_capacity = 32, .m_length = 31, .m_data = "Algal.Replay.EventKind.runStart"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.EventKind.effect"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.EventKind.runEnd"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__5_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprEventKind___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprEventKind_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprEventKind = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprEventKind___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqEventKind_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqEventKind_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqEventKind___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqEventKind_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqEventKind___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqEventKind___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqEventKind = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqEventKind___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEvent(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEvent___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqFields(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqFields___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReceipt(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReceipt___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_workOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_workOf___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_eventsOf___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Replay_eventsOf___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_eventsOf___closed__0_value;
static const lean_array_object lp_algalVerification_Algal_Replay_eventsOf___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Replay_eventsOf___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_eventsOf___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_eventsOf___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "outcome"};
static const lean_object* lp_algalVerification_Algal_Replay_eventsOf___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_eventsOf___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_eventsOf___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_eventsOf___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_eventsOf___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_eventsOf___closed__3_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_eventsOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_eventsOf___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_mintFields(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_mint(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_replaySlotsOf___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_replaySlotsOf___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Replay_replaySlotsOf___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "data"};
static const lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_replaySlotsOf___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_settledWritesOf(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_settledWritesOf___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_verifyCfg___lam__0(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__0___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__1___boxed(lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_verifyCfg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_verifyCfg___lam__0___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_verifyCfg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_verifyCfg___closed__0_value;
static const lean_closure_object lp_algalVerification_Algal_Replay_verifyCfg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_verifyCfg___lam__1___boxed, .m_arity = 1, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_verifyCfg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_verifyCfg___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Mismatch_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMismatch(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMismatch___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 37, .m_capacity = 37, .m_length = 36, .m_data = "Algal.Replay.Mismatch.manifestDigest"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Mismatch.outcome"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Replay.Mismatch.cells"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Mismatch.effects"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Replay.Mismatch.events"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Replay.Mismatch.work"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Mismatch.failure"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__13_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Replay.Mismatch.args"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__14_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__15_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Mismatch.runtime"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__16_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__17_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 34, .m_capacity = 34, .m_length = 33, .m_data = "Algal.Replay.Mismatch.manifestKey"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__18 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__18_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__18_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__19_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Replay.Mismatch.digest"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__20 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__20_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__20_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__21 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__21_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Mismatch.records"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__22 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__22_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__22_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__23 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__23_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprMismatch___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprMismatch_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprMismatch = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprMismatch___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqMismatch_beq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqMismatch_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqMismatch___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqMismatch_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqMismatch___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqMismatch___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqMismatch = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqMismatch___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(9) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(8) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(7) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(6) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(5) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(3) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(2) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffFields___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(1) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffFields___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__9_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_diffFields(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_diffReceipts___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(10) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_diffReceipts___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_diffReceipts___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_diffReceipts(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_verified_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_verified_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_mismatch_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_mismatch_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_rejected_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_rejected_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqVerdict(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqVerdict___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "[]"};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__0 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__0_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__1 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__1_value;
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "["};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__2 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__3 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "]"};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__4 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__4_value;
static lean_once_cell_t lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5;
static lean_once_cell_t lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__7 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__7_value;
static const lean_ctor_object lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__8 = (const lean_object*)&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__8_value;
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Verdict.verified"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Verdict.mismatch"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__3_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 30, .m_capacity = 30, .m_length = 29, .m_data = "Algal.Replay.Verdict.rejected"};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__6_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__7_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instReprVerdict___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instReprVerdict_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instReprVerdict = (const lean_object*)&lp_algalVerification_Algal_Replay_instReprVerdict___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqVerdict_beq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqVerdict_beq___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Replay_instBEqVerdict___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Replay_instBEqVerdict_beq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Replay_instBEqVerdict___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqVerdict___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Replay_instBEqVerdict = (const lean_object*)&lp_algalVerification_Algal_Replay_instBEqVerdict___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_verify___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Replay_diffFields___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Replay_verify___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_verify___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_verify___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(4, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Replay_verify___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_verify___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verify(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_resumeCfg___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resumeCfg___lam__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resumeCfg(lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Replay_resume___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(6) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_resume___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Replay_resume___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_resume___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_resume___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Replay_resume___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Replay_resume___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(7) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Replay_resume___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Replay_resume___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resume(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorIdx(uint8_t v_x_1_){
_start:
{
switch(v_x_1_)
{
case 0:
{
lean_object* v___x_2_; 
v___x_2_ = lean_unsigned_to_nat(0u);
return v___x_2_;
}
case 1:
{
lean_object* v___x_3_; 
v___x_3_ = lean_unsigned_to_nat(1u);
return v___x_3_;
}
case 2:
{
lean_object* v___x_4_; 
v___x_4_ = lean_unsigned_to_nat(2u);
return v___x_4_;
}
case 3:
{
lean_object* v___x_5_; 
v___x_5_ = lean_unsigned_to_nat(3u);
return v___x_5_;
}
case 4:
{
lean_object* v___x_6_; 
v___x_6_ = lean_unsigned_to_nat(4u);
return v___x_6_;
}
default: 
{
lean_object* v___x_7_; 
v___x_7_ = lean_unsigned_to_nat(5u);
return v___x_7_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorIdx___boxed(lean_object* v_x_8_){
_start:
{
uint8_t v_x_boxed_9_; lean_object* v_res_10_; 
v_x_boxed_9_ = lean_unbox(v_x_8_);
v_res_10_ = lp_algalVerification_Algal_Replay_Kind_ctorIdx(v_x_boxed_9_);
return v_res_10_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___redArg(lean_object* v_k_11_){
_start:
{
lean_inc(v_k_11_);
return v_k_11_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___redArg___boxed(lean_object* v_k_12_){
_start:
{
lean_object* v_res_13_; 
v_res_13_ = lp_algalVerification_Algal_Replay_Kind_ctorElim___redArg(v_k_12_);
lean_dec(v_k_12_);
return v_res_13_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim(lean_object* v_motive_14_, lean_object* v_ctorIdx_15_, uint8_t v_t_16_, lean_object* v_h_17_, lean_object* v_k_18_){
_start:
{
lean_inc(v_k_18_);
return v_k_18_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ctorElim___boxed(lean_object* v_motive_19_, lean_object* v_ctorIdx_20_, lean_object* v_t_21_, lean_object* v_h_22_, lean_object* v_k_23_){
_start:
{
uint8_t v_t_boxed_24_; lean_object* v_res_25_; 
v_t_boxed_24_ = lean_unbox(v_t_21_);
v_res_25_ = lp_algalVerification_Algal_Replay_Kind_ctorElim(v_motive_19_, v_ctorIdx_20_, v_t_boxed_24_, v_h_22_, v_k_23_);
lean_dec(v_k_23_);
lean_dec(v_ctorIdx_20_);
return v_res_25_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___redArg(lean_object* v_agent_26_){
_start:
{
lean_inc(v_agent_26_);
return v_agent_26_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___redArg___boxed(lean_object* v_agent_27_){
_start:
{
lean_object* v_res_28_; 
v_res_28_ = lp_algalVerification_Algal_Replay_Kind_agent_elim___redArg(v_agent_27_);
lean_dec(v_agent_27_);
return v_res_28_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim(lean_object* v_motive_29_, uint8_t v_t_30_, lean_object* v_h_31_, lean_object* v_agent_32_){
_start:
{
lean_inc(v_agent_32_);
return v_agent_32_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_agent_elim___boxed(lean_object* v_motive_33_, lean_object* v_t_34_, lean_object* v_h_35_, lean_object* v_agent_36_){
_start:
{
uint8_t v_t_boxed_37_; lean_object* v_res_38_; 
v_t_boxed_37_ = lean_unbox(v_t_34_);
v_res_38_ = lp_algalVerification_Algal_Replay_Kind_agent_elim(v_motive_33_, v_t_boxed_37_, v_h_35_, v_agent_36_);
lean_dec(v_agent_36_);
return v_res_38_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___redArg(lean_object* v_classifier_39_){
_start:
{
lean_inc(v_classifier_39_);
return v_classifier_39_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___redArg___boxed(lean_object* v_classifier_40_){
_start:
{
lean_object* v_res_41_; 
v_res_41_ = lp_algalVerification_Algal_Replay_Kind_classifier_elim___redArg(v_classifier_40_);
lean_dec(v_classifier_40_);
return v_res_41_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim(lean_object* v_motive_42_, uint8_t v_t_43_, lean_object* v_h_44_, lean_object* v_classifier_45_){
_start:
{
lean_inc(v_classifier_45_);
return v_classifier_45_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_classifier_elim___boxed(lean_object* v_motive_46_, lean_object* v_t_47_, lean_object* v_h_48_, lean_object* v_classifier_49_){
_start:
{
uint8_t v_t_boxed_50_; lean_object* v_res_51_; 
v_t_boxed_50_ = lean_unbox(v_t_47_);
v_res_51_ = lp_algalVerification_Algal_Replay_Kind_classifier_elim(v_motive_46_, v_t_boxed_50_, v_h_48_, v_classifier_49_);
lean_dec(v_classifier_49_);
return v_res_51_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___redArg(lean_object* v_gate_52_){
_start:
{
lean_inc(v_gate_52_);
return v_gate_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___redArg___boxed(lean_object* v_gate_53_){
_start:
{
lean_object* v_res_54_; 
v_res_54_ = lp_algalVerification_Algal_Replay_Kind_gate_elim___redArg(v_gate_53_);
lean_dec(v_gate_53_);
return v_res_54_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim(lean_object* v_motive_55_, uint8_t v_t_56_, lean_object* v_h_57_, lean_object* v_gate_58_){
_start:
{
lean_inc(v_gate_58_);
return v_gate_58_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_gate_elim___boxed(lean_object* v_motive_59_, lean_object* v_t_60_, lean_object* v_h_61_, lean_object* v_gate_62_){
_start:
{
uint8_t v_t_boxed_63_; lean_object* v_res_64_; 
v_t_boxed_63_ = lean_unbox(v_t_60_);
v_res_64_ = lp_algalVerification_Algal_Replay_Kind_gate_elim(v_motive_59_, v_t_boxed_63_, v_h_61_, v_gate_62_);
lean_dec(v_gate_62_);
return v_res_64_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___redArg(lean_object* v_decide_65_){
_start:
{
lean_inc(v_decide_65_);
return v_decide_65_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___redArg___boxed(lean_object* v_decide_66_){
_start:
{
lean_object* v_res_67_; 
v_res_67_ = lp_algalVerification_Algal_Replay_Kind_decide_elim___redArg(v_decide_66_);
lean_dec(v_decide_66_);
return v_res_67_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim(lean_object* v_motive_68_, uint8_t v_t_69_, lean_object* v_h_70_, lean_object* v_decide_71_){
_start:
{
lean_inc(v_decide_71_);
return v_decide_71_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_decide_elim___boxed(lean_object* v_motive_72_, lean_object* v_t_73_, lean_object* v_h_74_, lean_object* v_decide_75_){
_start:
{
uint8_t v_t_boxed_76_; lean_object* v_res_77_; 
v_t_boxed_76_ = lean_unbox(v_t_73_);
v_res_77_ = lp_algalVerification_Algal_Replay_Kind_decide_elim(v_motive_72_, v_t_boxed_76_, v_h_74_, v_decide_75_);
lean_dec(v_decide_75_);
return v_res_77_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___redArg(lean_object* v_recall_78_){
_start:
{
lean_inc(v_recall_78_);
return v_recall_78_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___redArg___boxed(lean_object* v_recall_79_){
_start:
{
lean_object* v_res_80_; 
v_res_80_ = lp_algalVerification_Algal_Replay_Kind_recall_elim___redArg(v_recall_79_);
lean_dec(v_recall_79_);
return v_res_80_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim(lean_object* v_motive_81_, uint8_t v_t_82_, lean_object* v_h_83_, lean_object* v_recall_84_){
_start:
{
lean_inc(v_recall_84_);
return v_recall_84_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_recall_elim___boxed(lean_object* v_motive_85_, lean_object* v_t_86_, lean_object* v_h_87_, lean_object* v_recall_88_){
_start:
{
uint8_t v_t_boxed_89_; lean_object* v_res_90_; 
v_t_boxed_89_ = lean_unbox(v_t_86_);
v_res_90_ = lp_algalVerification_Algal_Replay_Kind_recall_elim(v_motive_85_, v_t_boxed_89_, v_h_87_, v_recall_88_);
lean_dec(v_recall_88_);
return v_res_90_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___redArg(lean_object* v_tool_91_){
_start:
{
lean_inc(v_tool_91_);
return v_tool_91_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___redArg___boxed(lean_object* v_tool_92_){
_start:
{
lean_object* v_res_93_; 
v_res_93_ = lp_algalVerification_Algal_Replay_Kind_tool_elim___redArg(v_tool_92_);
lean_dec(v_tool_92_);
return v_res_93_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim(lean_object* v_motive_94_, uint8_t v_t_95_, lean_object* v_h_96_, lean_object* v_tool_97_){
_start:
{
lean_inc(v_tool_97_);
return v_tool_97_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_tool_elim___boxed(lean_object* v_motive_98_, lean_object* v_t_99_, lean_object* v_h_100_, lean_object* v_tool_101_){
_start:
{
uint8_t v_t_boxed_102_; lean_object* v_res_103_; 
v_t_boxed_102_ = lean_unbox(v_t_99_);
v_res_103_ = lp_algalVerification_Algal_Replay_Kind_tool_elim(v_motive_98_, v_t_boxed_102_, v_h_100_, v_tool_101_);
lean_dec(v_tool_101_);
return v_res_103_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Kind_ofNat(lean_object* v_n_104_){
_start:
{
lean_object* v___x_105_; uint8_t v___x_106_; 
v___x_105_ = lean_unsigned_to_nat(2u);
v___x_106_ = lean_nat_dec_le(v_n_104_, v___x_105_);
if (v___x_106_ == 0)
{
lean_object* v___x_107_; uint8_t v___x_108_; 
v___x_107_ = lean_unsigned_to_nat(3u);
v___x_108_ = lean_nat_dec_le(v_n_104_, v___x_107_);
if (v___x_108_ == 0)
{
lean_object* v___x_109_; uint8_t v___x_110_; 
v___x_109_ = lean_unsigned_to_nat(4u);
v___x_110_ = lean_nat_dec_le(v_n_104_, v___x_109_);
if (v___x_110_ == 0)
{
uint8_t v___x_111_; 
v___x_111_ = 5;
return v___x_111_;
}
else
{
uint8_t v___x_112_; 
v___x_112_ = 4;
return v___x_112_;
}
}
else
{
uint8_t v___x_113_; 
v___x_113_ = 3;
return v___x_113_;
}
}
else
{
lean_object* v___x_114_; uint8_t v___x_115_; 
v___x_114_ = lean_unsigned_to_nat(0u);
v___x_115_ = lean_nat_dec_le(v_n_104_, v___x_114_);
if (v___x_115_ == 0)
{
lean_object* v___x_116_; uint8_t v___x_117_; 
v___x_116_ = lean_unsigned_to_nat(1u);
v___x_117_ = lean_nat_dec_le(v_n_104_, v___x_116_);
if (v___x_117_ == 0)
{
uint8_t v___x_118_; 
v___x_118_ = 2;
return v___x_118_;
}
else
{
uint8_t v___x_119_; 
v___x_119_ = 1;
return v___x_119_;
}
}
else
{
uint8_t v___x_120_; 
v___x_120_ = 0;
return v___x_120_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Kind_ofNat___boxed(lean_object* v_n_121_){
_start:
{
uint8_t v_res_122_; lean_object* v_r_123_; 
v_res_122_ = lp_algalVerification_Algal_Replay_Kind_ofNat(v_n_121_);
lean_dec(v_n_121_);
v_r_123_ = lean_box(v_res_122_);
return v_r_123_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqKind(uint8_t v_x_124_, uint8_t v_y_125_){
_start:
{
lean_object* v___x_126_; lean_object* v___x_127_; uint8_t v___x_128_; 
v___x_126_ = lp_algalVerification_Algal_Replay_Kind_ctorIdx(v_x_124_);
v___x_127_ = lp_algalVerification_Algal_Replay_Kind_ctorIdx(v_y_125_);
v___x_128_ = lean_nat_dec_eq(v___x_126_, v___x_127_);
lean_dec(v___x_127_);
lean_dec(v___x_126_);
return v___x_128_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqKind___boxed(lean_object* v_x_129_, lean_object* v_y_130_){
_start:
{
uint8_t v_x_13__boxed_131_; uint8_t v_y_14__boxed_132_; uint8_t v_res_133_; lean_object* v_r_134_; 
v_x_13__boxed_131_ = lean_unbox(v_x_129_);
v_y_14__boxed_132_ = lean_unbox(v_y_130_);
v_res_133_ = lp_algalVerification_Algal_Replay_instDecidableEqKind(v_x_13__boxed_131_, v_y_14__boxed_132_);
v_r_134_ = lean_box(v_res_133_);
return v_r_134_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12(void){
_start:
{
lean_object* v___x_153_; lean_object* v___x_154_; 
v___x_153_ = lean_unsigned_to_nat(2u);
v___x_154_ = lean_nat_to_int(v___x_153_);
return v___x_154_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13(void){
_start:
{
lean_object* v___x_155_; lean_object* v___x_156_; 
v___x_155_ = lean_unsigned_to_nat(1u);
v___x_156_ = lean_nat_to_int(v___x_155_);
return v___x_156_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr(uint8_t v_x_157_, lean_object* v_prec_158_){
_start:
{
lean_object* v___y_160_; lean_object* v___y_167_; lean_object* v___y_174_; lean_object* v___y_181_; lean_object* v___y_188_; lean_object* v___y_195_; 
switch(v_x_157_)
{
case 0:
{
lean_object* v___x_201_; uint8_t v___x_202_; 
v___x_201_ = lean_unsigned_to_nat(1024u);
v___x_202_ = lean_nat_dec_le(v___x_201_, v_prec_158_);
if (v___x_202_ == 0)
{
lean_object* v___x_203_; 
v___x_203_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_160_ = v___x_203_;
goto v___jp_159_;
}
else
{
lean_object* v___x_204_; 
v___x_204_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_160_ = v___x_204_;
goto v___jp_159_;
}
}
case 1:
{
lean_object* v___x_205_; uint8_t v___x_206_; 
v___x_205_ = lean_unsigned_to_nat(1024u);
v___x_206_ = lean_nat_dec_le(v___x_205_, v_prec_158_);
if (v___x_206_ == 0)
{
lean_object* v___x_207_; 
v___x_207_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_167_ = v___x_207_;
goto v___jp_166_;
}
else
{
lean_object* v___x_208_; 
v___x_208_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_167_ = v___x_208_;
goto v___jp_166_;
}
}
case 2:
{
lean_object* v___x_209_; uint8_t v___x_210_; 
v___x_209_ = lean_unsigned_to_nat(1024u);
v___x_210_ = lean_nat_dec_le(v___x_209_, v_prec_158_);
if (v___x_210_ == 0)
{
lean_object* v___x_211_; 
v___x_211_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_174_ = v___x_211_;
goto v___jp_173_;
}
else
{
lean_object* v___x_212_; 
v___x_212_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_174_ = v___x_212_;
goto v___jp_173_;
}
}
case 3:
{
lean_object* v___x_213_; uint8_t v___x_214_; 
v___x_213_ = lean_unsigned_to_nat(1024u);
v___x_214_ = lean_nat_dec_le(v___x_213_, v_prec_158_);
if (v___x_214_ == 0)
{
lean_object* v___x_215_; 
v___x_215_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_181_ = v___x_215_;
goto v___jp_180_;
}
else
{
lean_object* v___x_216_; 
v___x_216_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_181_ = v___x_216_;
goto v___jp_180_;
}
}
case 4:
{
lean_object* v___x_217_; uint8_t v___x_218_; 
v___x_217_ = lean_unsigned_to_nat(1024u);
v___x_218_ = lean_nat_dec_le(v___x_217_, v_prec_158_);
if (v___x_218_ == 0)
{
lean_object* v___x_219_; 
v___x_219_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_188_ = v___x_219_;
goto v___jp_187_;
}
else
{
lean_object* v___x_220_; 
v___x_220_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_188_ = v___x_220_;
goto v___jp_187_;
}
}
default: 
{
lean_object* v___x_221_; uint8_t v___x_222_; 
v___x_221_ = lean_unsigned_to_nat(1024u);
v___x_222_ = lean_nat_dec_le(v___x_221_, v_prec_158_);
if (v___x_222_ == 0)
{
lean_object* v___x_223_; 
v___x_223_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_195_ = v___x_223_;
goto v___jp_194_;
}
else
{
lean_object* v___x_224_; 
v___x_224_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_195_ = v___x_224_;
goto v___jp_194_;
}
}
}
v___jp_159_:
{
lean_object* v___x_161_; lean_object* v___x_162_; uint8_t v___x_163_; lean_object* v___x_164_; lean_object* v___x_165_; 
v___x_161_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__1));
lean_inc(v___y_160_);
v___x_162_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_162_, 0, v___y_160_);
lean_ctor_set(v___x_162_, 1, v___x_161_);
v___x_163_ = 0;
v___x_164_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_164_, 0, v___x_162_);
lean_ctor_set_uint8(v___x_164_, sizeof(void*)*1, v___x_163_);
v___x_165_ = l_Repr_addAppParen(v___x_164_, v_prec_158_);
return v___x_165_;
}
v___jp_166_:
{
lean_object* v___x_168_; lean_object* v___x_169_; uint8_t v___x_170_; lean_object* v___x_171_; lean_object* v___x_172_; 
v___x_168_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__3));
lean_inc(v___y_167_);
v___x_169_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_169_, 0, v___y_167_);
lean_ctor_set(v___x_169_, 1, v___x_168_);
v___x_170_ = 0;
v___x_171_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_171_, 0, v___x_169_);
lean_ctor_set_uint8(v___x_171_, sizeof(void*)*1, v___x_170_);
v___x_172_ = l_Repr_addAppParen(v___x_171_, v_prec_158_);
return v___x_172_;
}
v___jp_173_:
{
lean_object* v___x_175_; lean_object* v___x_176_; uint8_t v___x_177_; lean_object* v___x_178_; lean_object* v___x_179_; 
v___x_175_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__5));
lean_inc(v___y_174_);
v___x_176_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_176_, 0, v___y_174_);
lean_ctor_set(v___x_176_, 1, v___x_175_);
v___x_177_ = 0;
v___x_178_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_178_, 0, v___x_176_);
lean_ctor_set_uint8(v___x_178_, sizeof(void*)*1, v___x_177_);
v___x_179_ = l_Repr_addAppParen(v___x_178_, v_prec_158_);
return v___x_179_;
}
v___jp_180_:
{
lean_object* v___x_182_; lean_object* v___x_183_; uint8_t v___x_184_; lean_object* v___x_185_; lean_object* v___x_186_; 
v___x_182_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__7));
lean_inc(v___y_181_);
v___x_183_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_183_, 0, v___y_181_);
lean_ctor_set(v___x_183_, 1, v___x_182_);
v___x_184_ = 0;
v___x_185_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_185_, 0, v___x_183_);
lean_ctor_set_uint8(v___x_185_, sizeof(void*)*1, v___x_184_);
v___x_186_ = l_Repr_addAppParen(v___x_185_, v_prec_158_);
return v___x_186_;
}
v___jp_187_:
{
lean_object* v___x_189_; lean_object* v___x_190_; uint8_t v___x_191_; lean_object* v___x_192_; lean_object* v___x_193_; 
v___x_189_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__9));
lean_inc(v___y_188_);
v___x_190_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_190_, 0, v___y_188_);
lean_ctor_set(v___x_190_, 1, v___x_189_);
v___x_191_ = 0;
v___x_192_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_192_, 0, v___x_190_);
lean_ctor_set_uint8(v___x_192_, sizeof(void*)*1, v___x_191_);
v___x_193_ = l_Repr_addAppParen(v___x_192_, v_prec_158_);
return v___x_193_;
}
v___jp_194_:
{
lean_object* v___x_196_; lean_object* v___x_197_; uint8_t v___x_198_; lean_object* v___x_199_; lean_object* v___x_200_; 
v___x_196_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprKind_repr___closed__11));
lean_inc(v___y_195_);
v___x_197_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_197_, 0, v___y_195_);
lean_ctor_set(v___x_197_, 1, v___x_196_);
v___x_198_ = 0;
v___x_199_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_199_, 0, v___x_197_);
lean_ctor_set_uint8(v___x_199_, sizeof(void*)*1, v___x_198_);
v___x_200_ = l_Repr_addAppParen(v___x_199_, v_prec_158_);
return v___x_200_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprKind_repr___boxed(lean_object* v_x_225_, lean_object* v_prec_226_){
_start:
{
uint8_t v_x_345__boxed_227_; lean_object* v_res_228_; 
v_x_345__boxed_227_ = lean_unbox(v_x_225_);
v_res_228_ = lp_algalVerification_Algal_Replay_instReprKind_repr(v_x_345__boxed_227_, v_prec_226_);
lean_dec(v_prec_226_);
return v_res_228_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqKind_beq(uint8_t v_x_231_, uint8_t v_y_232_){
_start:
{
lean_object* v___x_233_; lean_object* v___x_234_; uint8_t v___x_235_; 
v___x_233_ = lp_algalVerification_Algal_Replay_Kind_ctorIdx(v_x_231_);
v___x_234_ = lp_algalVerification_Algal_Replay_Kind_ctorIdx(v_y_232_);
v___x_235_ = lean_nat_dec_eq(v___x_233_, v___x_234_);
lean_dec(v___x_234_);
lean_dec(v___x_233_);
return v___x_235_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqKind_beq___boxed(lean_object* v_x_236_, lean_object* v_y_237_){
_start:
{
uint8_t v_x_17__boxed_238_; uint8_t v_y_18__boxed_239_; uint8_t v_res_240_; lean_object* v_r_241_; 
v_x_17__boxed_238_ = lean_unbox(v_x_236_);
v_y_18__boxed_239_ = lean_unbox(v_y_237_);
v_res_240_ = lp_algalVerification_Algal_Replay_instBEqKind_beq(v_x_17__boxed_238_, v_y_18__boxed_239_);
v_r_241_ = lean_box(v_res_240_);
return v_r_241_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(uint8_t v_x_244_){
_start:
{
switch(v_x_244_)
{
case 0:
{
lean_object* v___x_245_; 
v___x_245_ = lean_unsigned_to_nat(0u);
return v___x_245_;
}
case 1:
{
lean_object* v___x_246_; 
v___x_246_ = lean_unsigned_to_nat(1u);
return v___x_246_;
}
case 2:
{
lean_object* v___x_247_; 
v___x_247_ = lean_unsigned_to_nat(2u);
return v___x_247_;
}
case 3:
{
lean_object* v___x_248_; 
v___x_248_ = lean_unsigned_to_nat(3u);
return v___x_248_;
}
case 4:
{
lean_object* v___x_249_; 
v___x_249_ = lean_unsigned_to_nat(4u);
return v___x_249_;
}
case 5:
{
lean_object* v___x_250_; 
v___x_250_ = lean_unsigned_to_nat(5u);
return v___x_250_;
}
case 6:
{
lean_object* v___x_251_; 
v___x_251_ = lean_unsigned_to_nat(6u);
return v___x_251_;
}
case 7:
{
lean_object* v___x_252_; 
v___x_252_ = lean_unsigned_to_nat(7u);
return v___x_252_;
}
case 8:
{
lean_object* v___x_253_; 
v___x_253_ = lean_unsigned_to_nat(8u);
return v___x_253_;
}
case 9:
{
lean_object* v___x_254_; 
v___x_254_ = lean_unsigned_to_nat(9u);
return v___x_254_;
}
case 10:
{
lean_object* v___x_255_; 
v___x_255_ = lean_unsigned_to_nat(10u);
return v___x_255_;
}
default: 
{
lean_object* v___x_256_; 
v___x_256_ = lean_unsigned_to_nat(11u);
return v___x_256_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx___boxed(lean_object* v_x_257_){
_start:
{
uint8_t v_x_boxed_258_; lean_object* v_res_259_; 
v_x_boxed_258_ = lean_unbox(v_x_257_);
v_res_259_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(v_x_boxed_258_);
return v_res_259_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___redArg(lean_object* v_k_260_){
_start:
{
lean_inc(v_k_260_);
return v_k_260_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___redArg___boxed(lean_object* v_k_261_){
_start:
{
lean_object* v_res_262_; 
v_res_262_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___redArg(v_k_261_);
lean_dec(v_k_261_);
return v_res_262_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim(lean_object* v_motive_263_, lean_object* v_ctorIdx_264_, uint8_t v_t_265_, lean_object* v_h_266_, lean_object* v_k_267_){
_start:
{
lean_inc(v_k_267_);
return v_k_267_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ctorElim___boxed(lean_object* v_motive_268_, lean_object* v_ctorIdx_269_, lean_object* v_t_270_, lean_object* v_h_271_, lean_object* v_k_272_){
_start:
{
uint8_t v_t_boxed_273_; lean_object* v_res_274_; 
v_t_boxed_273_ = lean_unbox(v_t_270_);
v_res_274_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorElim(v_motive_268_, v_ctorIdx_269_, v_t_boxed_273_, v_h_271_, v_k_272_);
lean_dec(v_k_272_);
lean_dec(v_ctorIdx_269_);
return v_res_274_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___redArg(lean_object* v_effectUnbound_275_){
_start:
{
lean_inc(v_effectUnbound_275_);
return v_effectUnbound_275_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___redArg___boxed(lean_object* v_effectUnbound_276_){
_start:
{
lean_object* v_res_277_; 
v_res_277_ = lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___redArg(v_effectUnbound_276_);
lean_dec(v_effectUnbound_276_);
return v_res_277_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim(lean_object* v_motive_278_, uint8_t v_t_279_, lean_object* v_h_280_, lean_object* v_effectUnbound_281_){
_start:
{
lean_inc(v_effectUnbound_281_);
return v_effectUnbound_281_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim___boxed(lean_object* v_motive_282_, lean_object* v_t_283_, lean_object* v_h_284_, lean_object* v_effectUnbound_285_){
_start:
{
uint8_t v_t_boxed_286_; lean_object* v_res_287_; 
v_t_boxed_286_ = lean_unbox(v_t_283_);
v_res_287_ = lp_algalVerification_Algal_Replay_ErrorCode_effectUnbound_elim(v_motive_282_, v_t_boxed_286_, v_h_284_, v_effectUnbound_285_);
lean_dec(v_effectUnbound_285_);
return v_res_287_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___redArg(lean_object* v_effectFailed_288_){
_start:
{
lean_inc(v_effectFailed_288_);
return v_effectFailed_288_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___redArg___boxed(lean_object* v_effectFailed_289_){
_start:
{
lean_object* v_res_290_; 
v_res_290_ = lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___redArg(v_effectFailed_289_);
lean_dec(v_effectFailed_289_);
return v_res_290_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim(lean_object* v_motive_291_, uint8_t v_t_292_, lean_object* v_h_293_, lean_object* v_effectFailed_294_){
_start:
{
lean_inc(v_effectFailed_294_);
return v_effectFailed_294_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim___boxed(lean_object* v_motive_295_, lean_object* v_t_296_, lean_object* v_h_297_, lean_object* v_effectFailed_298_){
_start:
{
uint8_t v_t_boxed_299_; lean_object* v_res_300_; 
v_t_boxed_299_ = lean_unbox(v_t_296_);
v_res_300_ = lp_algalVerification_Algal_Replay_ErrorCode_effectFailed_elim(v_motive_295_, v_t_boxed_299_, v_h_297_, v_effectFailed_298_);
lean_dec(v_effectFailed_298_);
return v_res_300_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___redArg(lean_object* v_effectUnparseable_301_){
_start:
{
lean_inc(v_effectUnparseable_301_);
return v_effectUnparseable_301_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___redArg___boxed(lean_object* v_effectUnparseable_302_){
_start:
{
lean_object* v_res_303_; 
v_res_303_ = lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___redArg(v_effectUnparseable_302_);
lean_dec(v_effectUnparseable_302_);
return v_res_303_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim(lean_object* v_motive_304_, uint8_t v_t_305_, lean_object* v_h_306_, lean_object* v_effectUnparseable_307_){
_start:
{
lean_inc(v_effectUnparseable_307_);
return v_effectUnparseable_307_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim___boxed(lean_object* v_motive_308_, lean_object* v_t_309_, lean_object* v_h_310_, lean_object* v_effectUnparseable_311_){
_start:
{
uint8_t v_t_boxed_312_; lean_object* v_res_313_; 
v_t_boxed_312_ = lean_unbox(v_t_309_);
v_res_313_ = lp_algalVerification_Algal_Replay_ErrorCode_effectUnparseable_elim(v_motive_308_, v_t_boxed_312_, v_h_310_, v_effectUnparseable_311_);
lean_dec(v_effectUnparseable_311_);
return v_res_313_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___redArg(lean_object* v_inputMissing_314_){
_start:
{
lean_inc(v_inputMissing_314_);
return v_inputMissing_314_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___redArg___boxed(lean_object* v_inputMissing_315_){
_start:
{
lean_object* v_res_316_; 
v_res_316_ = lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___redArg(v_inputMissing_315_);
lean_dec(v_inputMissing_315_);
return v_res_316_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim(lean_object* v_motive_317_, uint8_t v_t_318_, lean_object* v_h_319_, lean_object* v_inputMissing_320_){
_start:
{
lean_inc(v_inputMissing_320_);
return v_inputMissing_320_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim___boxed(lean_object* v_motive_321_, lean_object* v_t_322_, lean_object* v_h_323_, lean_object* v_inputMissing_324_){
_start:
{
uint8_t v_t_boxed_325_; lean_object* v_res_326_; 
v_t_boxed_325_ = lean_unbox(v_t_322_);
v_res_326_ = lp_algalVerification_Algal_Replay_ErrorCode_inputMissing_elim(v_motive_321_, v_t_boxed_325_, v_h_323_, v_inputMissing_324_);
lean_dec(v_inputMissing_324_);
return v_res_326_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___redArg(lean_object* v_storeMiss_327_){
_start:
{
lean_inc(v_storeMiss_327_);
return v_storeMiss_327_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___redArg___boxed(lean_object* v_storeMiss_328_){
_start:
{
lean_object* v_res_329_; 
v_res_329_ = lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___redArg(v_storeMiss_328_);
lean_dec(v_storeMiss_328_);
return v_res_329_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim(lean_object* v_motive_330_, uint8_t v_t_331_, lean_object* v_h_332_, lean_object* v_storeMiss_333_){
_start:
{
lean_inc(v_storeMiss_333_);
return v_storeMiss_333_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim___boxed(lean_object* v_motive_334_, lean_object* v_t_335_, lean_object* v_h_336_, lean_object* v_storeMiss_337_){
_start:
{
uint8_t v_t_boxed_338_; lean_object* v_res_339_; 
v_t_boxed_338_ = lean_unbox(v_t_335_);
v_res_339_ = lp_algalVerification_Algal_Replay_ErrorCode_storeMiss_elim(v_motive_334_, v_t_boxed_338_, v_h_336_, v_storeMiss_337_);
lean_dec(v_storeMiss_337_);
return v_res_339_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___redArg(lean_object* v_budgetExhausted_340_){
_start:
{
lean_inc(v_budgetExhausted_340_);
return v_budgetExhausted_340_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___redArg___boxed(lean_object* v_budgetExhausted_341_){
_start:
{
lean_object* v_res_342_; 
v_res_342_ = lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___redArg(v_budgetExhausted_341_);
lean_dec(v_budgetExhausted_341_);
return v_res_342_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim(lean_object* v_motive_343_, uint8_t v_t_344_, lean_object* v_h_345_, lean_object* v_budgetExhausted_346_){
_start:
{
lean_inc(v_budgetExhausted_346_);
return v_budgetExhausted_346_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim___boxed(lean_object* v_motive_347_, lean_object* v_t_348_, lean_object* v_h_349_, lean_object* v_budgetExhausted_350_){
_start:
{
uint8_t v_t_boxed_351_; lean_object* v_res_352_; 
v_t_boxed_351_ = lean_unbox(v_t_348_);
v_res_352_ = lp_algalVerification_Algal_Replay_ErrorCode_budgetExhausted_elim(v_motive_347_, v_t_boxed_351_, v_h_349_, v_budgetExhausted_350_);
lean_dec(v_budgetExhausted_350_);
return v_res_352_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___redArg(lean_object* v_digestMismatch_353_){
_start:
{
lean_inc(v_digestMismatch_353_);
return v_digestMismatch_353_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___redArg___boxed(lean_object* v_digestMismatch_354_){
_start:
{
lean_object* v_res_355_; 
v_res_355_ = lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___redArg(v_digestMismatch_354_);
lean_dec(v_digestMismatch_354_);
return v_res_355_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim(lean_object* v_motive_356_, uint8_t v_t_357_, lean_object* v_h_358_, lean_object* v_digestMismatch_359_){
_start:
{
lean_inc(v_digestMismatch_359_);
return v_digestMismatch_359_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim___boxed(lean_object* v_motive_360_, lean_object* v_t_361_, lean_object* v_h_362_, lean_object* v_digestMismatch_363_){
_start:
{
uint8_t v_t_boxed_364_; lean_object* v_res_365_; 
v_t_boxed_364_ = lean_unbox(v_t_361_);
v_res_365_ = lp_algalVerification_Algal_Replay_ErrorCode_digestMismatch_elim(v_motive_360_, v_t_boxed_364_, v_h_362_, v_digestMismatch_363_);
lean_dec(v_digestMismatch_363_);
return v_res_365_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___redArg(lean_object* v_receiptMismatch_366_){
_start:
{
lean_inc(v_receiptMismatch_366_);
return v_receiptMismatch_366_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___redArg___boxed(lean_object* v_receiptMismatch_367_){
_start:
{
lean_object* v_res_368_; 
v_res_368_ = lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___redArg(v_receiptMismatch_367_);
lean_dec(v_receiptMismatch_367_);
return v_res_368_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim(lean_object* v_motive_369_, uint8_t v_t_370_, lean_object* v_h_371_, lean_object* v_receiptMismatch_372_){
_start:
{
lean_inc(v_receiptMismatch_372_);
return v_receiptMismatch_372_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim___boxed(lean_object* v_motive_373_, lean_object* v_t_374_, lean_object* v_h_375_, lean_object* v_receiptMismatch_376_){
_start:
{
uint8_t v_t_boxed_377_; lean_object* v_res_378_; 
v_t_boxed_377_ = lean_unbox(v_t_374_);
v_res_378_ = lp_algalVerification_Algal_Replay_ErrorCode_receiptMismatch_elim(v_motive_373_, v_t_boxed_377_, v_h_375_, v_receiptMismatch_376_);
lean_dec(v_receiptMismatch_376_);
return v_res_378_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___redArg(lean_object* v_toolUnknown_379_){
_start:
{
lean_inc(v_toolUnknown_379_);
return v_toolUnknown_379_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___redArg___boxed(lean_object* v_toolUnknown_380_){
_start:
{
lean_object* v_res_381_; 
v_res_381_ = lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___redArg(v_toolUnknown_380_);
lean_dec(v_toolUnknown_380_);
return v_res_381_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim(lean_object* v_motive_382_, uint8_t v_t_383_, lean_object* v_h_384_, lean_object* v_toolUnknown_385_){
_start:
{
lean_inc(v_toolUnknown_385_);
return v_toolUnknown_385_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim___boxed(lean_object* v_motive_386_, lean_object* v_t_387_, lean_object* v_h_388_, lean_object* v_toolUnknown_389_){
_start:
{
uint8_t v_t_boxed_390_; lean_object* v_res_391_; 
v_t_boxed_390_ = lean_unbox(v_t_387_);
v_res_391_ = lp_algalVerification_Algal_Replay_ErrorCode_toolUnknown_elim(v_motive_386_, v_t_boxed_390_, v_h_388_, v_toolUnknown_389_);
lean_dec(v_toolUnknown_389_);
return v_res_391_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___redArg(lean_object* v_parseFailed_392_){
_start:
{
lean_inc(v_parseFailed_392_);
return v_parseFailed_392_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___redArg___boxed(lean_object* v_parseFailed_393_){
_start:
{
lean_object* v_res_394_; 
v_res_394_ = lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___redArg(v_parseFailed_393_);
lean_dec(v_parseFailed_393_);
return v_res_394_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim(lean_object* v_motive_395_, uint8_t v_t_396_, lean_object* v_h_397_, lean_object* v_parseFailed_398_){
_start:
{
lean_inc(v_parseFailed_398_);
return v_parseFailed_398_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim___boxed(lean_object* v_motive_399_, lean_object* v_t_400_, lean_object* v_h_401_, lean_object* v_parseFailed_402_){
_start:
{
uint8_t v_t_boxed_403_; lean_object* v_res_404_; 
v_t_boxed_403_ = lean_unbox(v_t_400_);
v_res_404_ = lp_algalVerification_Algal_Replay_ErrorCode_parseFailed_elim(v_motive_399_, v_t_boxed_403_, v_h_401_, v_parseFailed_402_);
lean_dec(v_parseFailed_402_);
return v_res_404_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___redArg(lean_object* v_typeMismatch_405_){
_start:
{
lean_inc(v_typeMismatch_405_);
return v_typeMismatch_405_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___redArg___boxed(lean_object* v_typeMismatch_406_){
_start:
{
lean_object* v_res_407_; 
v_res_407_ = lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___redArg(v_typeMismatch_406_);
lean_dec(v_typeMismatch_406_);
return v_res_407_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim(lean_object* v_motive_408_, uint8_t v_t_409_, lean_object* v_h_410_, lean_object* v_typeMismatch_411_){
_start:
{
lean_inc(v_typeMismatch_411_);
return v_typeMismatch_411_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim___boxed(lean_object* v_motive_412_, lean_object* v_t_413_, lean_object* v_h_414_, lean_object* v_typeMismatch_415_){
_start:
{
uint8_t v_t_boxed_416_; lean_object* v_res_417_; 
v_t_boxed_416_ = lean_unbox(v_t_413_);
v_res_417_ = lp_algalVerification_Algal_Replay_ErrorCode_typeMismatch_elim(v_motive_412_, v_t_boxed_416_, v_h_414_, v_typeMismatch_415_);
lean_dec(v_typeMismatch_415_);
return v_res_417_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___redArg(lean_object* v_internal_418_){
_start:
{
lean_inc(v_internal_418_);
return v_internal_418_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___redArg___boxed(lean_object* v_internal_419_){
_start:
{
lean_object* v_res_420_; 
v_res_420_ = lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___redArg(v_internal_419_);
lean_dec(v_internal_419_);
return v_res_420_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim(lean_object* v_motive_421_, uint8_t v_t_422_, lean_object* v_h_423_, lean_object* v_internal_424_){
_start:
{
lean_inc(v_internal_424_);
return v_internal_424_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_internal_elim___boxed(lean_object* v_motive_425_, lean_object* v_t_426_, lean_object* v_h_427_, lean_object* v_internal_428_){
_start:
{
uint8_t v_t_boxed_429_; lean_object* v_res_430_; 
v_t_boxed_429_ = lean_unbox(v_t_426_);
v_res_430_ = lp_algalVerification_Algal_Replay_ErrorCode_internal_elim(v_motive_425_, v_t_boxed_429_, v_h_427_, v_internal_428_);
lean_dec(v_internal_428_);
return v_res_430_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_ErrorCode_ofNat(lean_object* v_n_431_){
_start:
{
lean_object* v___x_432_; uint8_t v___x_433_; 
v___x_432_ = lean_unsigned_to_nat(5u);
v___x_433_ = lean_nat_dec_le(v_n_431_, v___x_432_);
if (v___x_433_ == 0)
{
lean_object* v___x_434_; uint8_t v___x_435_; 
v___x_434_ = lean_unsigned_to_nat(8u);
v___x_435_ = lean_nat_dec_le(v_n_431_, v___x_434_);
if (v___x_435_ == 0)
{
lean_object* v___x_436_; uint8_t v___x_437_; 
v___x_436_ = lean_unsigned_to_nat(9u);
v___x_437_ = lean_nat_dec_le(v_n_431_, v___x_436_);
if (v___x_437_ == 0)
{
lean_object* v___x_438_; uint8_t v___x_439_; 
v___x_438_ = lean_unsigned_to_nat(10u);
v___x_439_ = lean_nat_dec_le(v_n_431_, v___x_438_);
if (v___x_439_ == 0)
{
uint8_t v___x_440_; 
v___x_440_ = 11;
return v___x_440_;
}
else
{
uint8_t v___x_441_; 
v___x_441_ = 10;
return v___x_441_;
}
}
else
{
uint8_t v___x_442_; 
v___x_442_ = 9;
return v___x_442_;
}
}
else
{
lean_object* v___x_443_; uint8_t v___x_444_; 
v___x_443_ = lean_unsigned_to_nat(6u);
v___x_444_ = lean_nat_dec_le(v_n_431_, v___x_443_);
if (v___x_444_ == 0)
{
lean_object* v___x_445_; uint8_t v___x_446_; 
v___x_445_ = lean_unsigned_to_nat(7u);
v___x_446_ = lean_nat_dec_le(v_n_431_, v___x_445_);
if (v___x_446_ == 0)
{
uint8_t v___x_447_; 
v___x_447_ = 8;
return v___x_447_;
}
else
{
uint8_t v___x_448_; 
v___x_448_ = 7;
return v___x_448_;
}
}
else
{
uint8_t v___x_449_; 
v___x_449_ = 6;
return v___x_449_;
}
}
}
else
{
lean_object* v___x_450_; uint8_t v___x_451_; 
v___x_450_ = lean_unsigned_to_nat(2u);
v___x_451_ = lean_nat_dec_le(v_n_431_, v___x_450_);
if (v___x_451_ == 0)
{
lean_object* v___x_452_; uint8_t v___x_453_; 
v___x_452_ = lean_unsigned_to_nat(3u);
v___x_453_ = lean_nat_dec_le(v_n_431_, v___x_452_);
if (v___x_453_ == 0)
{
lean_object* v___x_454_; uint8_t v___x_455_; 
v___x_454_ = lean_unsigned_to_nat(4u);
v___x_455_ = lean_nat_dec_le(v_n_431_, v___x_454_);
if (v___x_455_ == 0)
{
uint8_t v___x_456_; 
v___x_456_ = 5;
return v___x_456_;
}
else
{
uint8_t v___x_457_; 
v___x_457_ = 4;
return v___x_457_;
}
}
else
{
uint8_t v___x_458_; 
v___x_458_ = 3;
return v___x_458_;
}
}
else
{
lean_object* v___x_459_; uint8_t v___x_460_; 
v___x_459_ = lean_unsigned_to_nat(0u);
v___x_460_ = lean_nat_dec_le(v_n_431_, v___x_459_);
if (v___x_460_ == 0)
{
lean_object* v___x_461_; uint8_t v___x_462_; 
v___x_461_ = lean_unsigned_to_nat(1u);
v___x_462_ = lean_nat_dec_le(v_n_431_, v___x_461_);
if (v___x_462_ == 0)
{
uint8_t v___x_463_; 
v___x_463_ = 2;
return v___x_463_;
}
else
{
uint8_t v___x_464_; 
v___x_464_ = 1;
return v___x_464_;
}
}
else
{
uint8_t v___x_465_; 
v___x_465_ = 0;
return v___x_465_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_ErrorCode_ofNat___boxed(lean_object* v_n_466_){
_start:
{
uint8_t v_res_467_; lean_object* v_r_468_; 
v_res_467_ = lp_algalVerification_Algal_Replay_ErrorCode_ofNat(v_n_466_);
lean_dec(v_n_466_);
v_r_468_ = lean_box(v_res_467_);
return v_r_468_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqErrorCode(uint8_t v_x_469_, uint8_t v_y_470_){
_start:
{
lean_object* v___x_471_; lean_object* v___x_472_; uint8_t v___x_473_; 
v___x_471_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(v_x_469_);
v___x_472_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(v_y_470_);
v___x_473_ = lean_nat_dec_eq(v___x_471_, v___x_472_);
lean_dec(v___x_472_);
lean_dec(v___x_471_);
return v___x_473_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed(lean_object* v_x_474_, lean_object* v_y_475_){
_start:
{
uint8_t v_x_13__boxed_476_; uint8_t v_y_14__boxed_477_; uint8_t v_res_478_; lean_object* v_r_479_; 
v_x_13__boxed_476_ = lean_unbox(v_x_474_);
v_y_14__boxed_477_ = lean_unbox(v_y_475_);
v_res_478_ = lp_algalVerification_Algal_Replay_instDecidableEqErrorCode(v_x_13__boxed_476_, v_y_14__boxed_477_);
v_r_479_ = lean_box(v_res_478_);
return v_r_479_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr(uint8_t v_x_516_, lean_object* v_prec_517_){
_start:
{
lean_object* v___y_519_; lean_object* v___y_526_; lean_object* v___y_533_; lean_object* v___y_540_; lean_object* v___y_547_; lean_object* v___y_554_; lean_object* v___y_561_; lean_object* v___y_568_; lean_object* v___y_575_; lean_object* v___y_582_; lean_object* v___y_589_; lean_object* v___y_596_; 
switch(v_x_516_)
{
case 0:
{
lean_object* v___x_602_; uint8_t v___x_603_; 
v___x_602_ = lean_unsigned_to_nat(1024u);
v___x_603_ = lean_nat_dec_le(v___x_602_, v_prec_517_);
if (v___x_603_ == 0)
{
lean_object* v___x_604_; 
v___x_604_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_519_ = v___x_604_;
goto v___jp_518_;
}
else
{
lean_object* v___x_605_; 
v___x_605_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_519_ = v___x_605_;
goto v___jp_518_;
}
}
case 1:
{
lean_object* v___x_606_; uint8_t v___x_607_; 
v___x_606_ = lean_unsigned_to_nat(1024u);
v___x_607_ = lean_nat_dec_le(v___x_606_, v_prec_517_);
if (v___x_607_ == 0)
{
lean_object* v___x_608_; 
v___x_608_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_526_ = v___x_608_;
goto v___jp_525_;
}
else
{
lean_object* v___x_609_; 
v___x_609_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_526_ = v___x_609_;
goto v___jp_525_;
}
}
case 2:
{
lean_object* v___x_610_; uint8_t v___x_611_; 
v___x_610_ = lean_unsigned_to_nat(1024u);
v___x_611_ = lean_nat_dec_le(v___x_610_, v_prec_517_);
if (v___x_611_ == 0)
{
lean_object* v___x_612_; 
v___x_612_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_533_ = v___x_612_;
goto v___jp_532_;
}
else
{
lean_object* v___x_613_; 
v___x_613_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_533_ = v___x_613_;
goto v___jp_532_;
}
}
case 3:
{
lean_object* v___x_614_; uint8_t v___x_615_; 
v___x_614_ = lean_unsigned_to_nat(1024u);
v___x_615_ = lean_nat_dec_le(v___x_614_, v_prec_517_);
if (v___x_615_ == 0)
{
lean_object* v___x_616_; 
v___x_616_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_540_ = v___x_616_;
goto v___jp_539_;
}
else
{
lean_object* v___x_617_; 
v___x_617_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_540_ = v___x_617_;
goto v___jp_539_;
}
}
case 4:
{
lean_object* v___x_618_; uint8_t v___x_619_; 
v___x_618_ = lean_unsigned_to_nat(1024u);
v___x_619_ = lean_nat_dec_le(v___x_618_, v_prec_517_);
if (v___x_619_ == 0)
{
lean_object* v___x_620_; 
v___x_620_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_547_ = v___x_620_;
goto v___jp_546_;
}
else
{
lean_object* v___x_621_; 
v___x_621_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_547_ = v___x_621_;
goto v___jp_546_;
}
}
case 5:
{
lean_object* v___x_622_; uint8_t v___x_623_; 
v___x_622_ = lean_unsigned_to_nat(1024u);
v___x_623_ = lean_nat_dec_le(v___x_622_, v_prec_517_);
if (v___x_623_ == 0)
{
lean_object* v___x_624_; 
v___x_624_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_554_ = v___x_624_;
goto v___jp_553_;
}
else
{
lean_object* v___x_625_; 
v___x_625_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_554_ = v___x_625_;
goto v___jp_553_;
}
}
case 6:
{
lean_object* v___x_626_; uint8_t v___x_627_; 
v___x_626_ = lean_unsigned_to_nat(1024u);
v___x_627_ = lean_nat_dec_le(v___x_626_, v_prec_517_);
if (v___x_627_ == 0)
{
lean_object* v___x_628_; 
v___x_628_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_561_ = v___x_628_;
goto v___jp_560_;
}
else
{
lean_object* v___x_629_; 
v___x_629_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_561_ = v___x_629_;
goto v___jp_560_;
}
}
case 7:
{
lean_object* v___x_630_; uint8_t v___x_631_; 
v___x_630_ = lean_unsigned_to_nat(1024u);
v___x_631_ = lean_nat_dec_le(v___x_630_, v_prec_517_);
if (v___x_631_ == 0)
{
lean_object* v___x_632_; 
v___x_632_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_568_ = v___x_632_;
goto v___jp_567_;
}
else
{
lean_object* v___x_633_; 
v___x_633_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_568_ = v___x_633_;
goto v___jp_567_;
}
}
case 8:
{
lean_object* v___x_634_; uint8_t v___x_635_; 
v___x_634_ = lean_unsigned_to_nat(1024u);
v___x_635_ = lean_nat_dec_le(v___x_634_, v_prec_517_);
if (v___x_635_ == 0)
{
lean_object* v___x_636_; 
v___x_636_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_575_ = v___x_636_;
goto v___jp_574_;
}
else
{
lean_object* v___x_637_; 
v___x_637_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_575_ = v___x_637_;
goto v___jp_574_;
}
}
case 9:
{
lean_object* v___x_638_; uint8_t v___x_639_; 
v___x_638_ = lean_unsigned_to_nat(1024u);
v___x_639_ = lean_nat_dec_le(v___x_638_, v_prec_517_);
if (v___x_639_ == 0)
{
lean_object* v___x_640_; 
v___x_640_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_582_ = v___x_640_;
goto v___jp_581_;
}
else
{
lean_object* v___x_641_; 
v___x_641_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_582_ = v___x_641_;
goto v___jp_581_;
}
}
case 10:
{
lean_object* v___x_642_; uint8_t v___x_643_; 
v___x_642_ = lean_unsigned_to_nat(1024u);
v___x_643_ = lean_nat_dec_le(v___x_642_, v_prec_517_);
if (v___x_643_ == 0)
{
lean_object* v___x_644_; 
v___x_644_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_589_ = v___x_644_;
goto v___jp_588_;
}
else
{
lean_object* v___x_645_; 
v___x_645_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_589_ = v___x_645_;
goto v___jp_588_;
}
}
default: 
{
lean_object* v___x_646_; uint8_t v___x_647_; 
v___x_646_ = lean_unsigned_to_nat(1024u);
v___x_647_ = lean_nat_dec_le(v___x_646_, v_prec_517_);
if (v___x_647_ == 0)
{
lean_object* v___x_648_; 
v___x_648_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_596_ = v___x_648_;
goto v___jp_595_;
}
else
{
lean_object* v___x_649_; 
v___x_649_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_596_ = v___x_649_;
goto v___jp_595_;
}
}
}
v___jp_518_:
{
lean_object* v___x_520_; lean_object* v___x_521_; uint8_t v___x_522_; lean_object* v___x_523_; lean_object* v___x_524_; 
v___x_520_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__1));
lean_inc(v___y_519_);
v___x_521_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_521_, 0, v___y_519_);
lean_ctor_set(v___x_521_, 1, v___x_520_);
v___x_522_ = 0;
v___x_523_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_523_, 0, v___x_521_);
lean_ctor_set_uint8(v___x_523_, sizeof(void*)*1, v___x_522_);
v___x_524_ = l_Repr_addAppParen(v___x_523_, v_prec_517_);
return v___x_524_;
}
v___jp_525_:
{
lean_object* v___x_527_; lean_object* v___x_528_; uint8_t v___x_529_; lean_object* v___x_530_; lean_object* v___x_531_; 
v___x_527_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__3));
lean_inc(v___y_526_);
v___x_528_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_528_, 0, v___y_526_);
lean_ctor_set(v___x_528_, 1, v___x_527_);
v___x_529_ = 0;
v___x_530_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_530_, 0, v___x_528_);
lean_ctor_set_uint8(v___x_530_, sizeof(void*)*1, v___x_529_);
v___x_531_ = l_Repr_addAppParen(v___x_530_, v_prec_517_);
return v___x_531_;
}
v___jp_532_:
{
lean_object* v___x_534_; lean_object* v___x_535_; uint8_t v___x_536_; lean_object* v___x_537_; lean_object* v___x_538_; 
v___x_534_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__5));
lean_inc(v___y_533_);
v___x_535_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_535_, 0, v___y_533_);
lean_ctor_set(v___x_535_, 1, v___x_534_);
v___x_536_ = 0;
v___x_537_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_537_, 0, v___x_535_);
lean_ctor_set_uint8(v___x_537_, sizeof(void*)*1, v___x_536_);
v___x_538_ = l_Repr_addAppParen(v___x_537_, v_prec_517_);
return v___x_538_;
}
v___jp_539_:
{
lean_object* v___x_541_; lean_object* v___x_542_; uint8_t v___x_543_; lean_object* v___x_544_; lean_object* v___x_545_; 
v___x_541_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__7));
lean_inc(v___y_540_);
v___x_542_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_542_, 0, v___y_540_);
lean_ctor_set(v___x_542_, 1, v___x_541_);
v___x_543_ = 0;
v___x_544_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_544_, 0, v___x_542_);
lean_ctor_set_uint8(v___x_544_, sizeof(void*)*1, v___x_543_);
v___x_545_ = l_Repr_addAppParen(v___x_544_, v_prec_517_);
return v___x_545_;
}
v___jp_546_:
{
lean_object* v___x_548_; lean_object* v___x_549_; uint8_t v___x_550_; lean_object* v___x_551_; lean_object* v___x_552_; 
v___x_548_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__9));
lean_inc(v___y_547_);
v___x_549_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_549_, 0, v___y_547_);
lean_ctor_set(v___x_549_, 1, v___x_548_);
v___x_550_ = 0;
v___x_551_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_551_, 0, v___x_549_);
lean_ctor_set_uint8(v___x_551_, sizeof(void*)*1, v___x_550_);
v___x_552_ = l_Repr_addAppParen(v___x_551_, v_prec_517_);
return v___x_552_;
}
v___jp_553_:
{
lean_object* v___x_555_; lean_object* v___x_556_; uint8_t v___x_557_; lean_object* v___x_558_; lean_object* v___x_559_; 
v___x_555_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__11));
lean_inc(v___y_554_);
v___x_556_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_556_, 0, v___y_554_);
lean_ctor_set(v___x_556_, 1, v___x_555_);
v___x_557_ = 0;
v___x_558_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_558_, 0, v___x_556_);
lean_ctor_set_uint8(v___x_558_, sizeof(void*)*1, v___x_557_);
v___x_559_ = l_Repr_addAppParen(v___x_558_, v_prec_517_);
return v___x_559_;
}
v___jp_560_:
{
lean_object* v___x_562_; lean_object* v___x_563_; uint8_t v___x_564_; lean_object* v___x_565_; lean_object* v___x_566_; 
v___x_562_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__13));
lean_inc(v___y_561_);
v___x_563_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_563_, 0, v___y_561_);
lean_ctor_set(v___x_563_, 1, v___x_562_);
v___x_564_ = 0;
v___x_565_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_565_, 0, v___x_563_);
lean_ctor_set_uint8(v___x_565_, sizeof(void*)*1, v___x_564_);
v___x_566_ = l_Repr_addAppParen(v___x_565_, v_prec_517_);
return v___x_566_;
}
v___jp_567_:
{
lean_object* v___x_569_; lean_object* v___x_570_; uint8_t v___x_571_; lean_object* v___x_572_; lean_object* v___x_573_; 
v___x_569_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__15));
lean_inc(v___y_568_);
v___x_570_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_570_, 0, v___y_568_);
lean_ctor_set(v___x_570_, 1, v___x_569_);
v___x_571_ = 0;
v___x_572_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_572_, 0, v___x_570_);
lean_ctor_set_uint8(v___x_572_, sizeof(void*)*1, v___x_571_);
v___x_573_ = l_Repr_addAppParen(v___x_572_, v_prec_517_);
return v___x_573_;
}
v___jp_574_:
{
lean_object* v___x_576_; lean_object* v___x_577_; uint8_t v___x_578_; lean_object* v___x_579_; lean_object* v___x_580_; 
v___x_576_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__17));
lean_inc(v___y_575_);
v___x_577_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_577_, 0, v___y_575_);
lean_ctor_set(v___x_577_, 1, v___x_576_);
v___x_578_ = 0;
v___x_579_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_579_, 0, v___x_577_);
lean_ctor_set_uint8(v___x_579_, sizeof(void*)*1, v___x_578_);
v___x_580_ = l_Repr_addAppParen(v___x_579_, v_prec_517_);
return v___x_580_;
}
v___jp_581_:
{
lean_object* v___x_583_; lean_object* v___x_584_; uint8_t v___x_585_; lean_object* v___x_586_; lean_object* v___x_587_; 
v___x_583_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__19));
lean_inc(v___y_582_);
v___x_584_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_584_, 0, v___y_582_);
lean_ctor_set(v___x_584_, 1, v___x_583_);
v___x_585_ = 0;
v___x_586_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_586_, 0, v___x_584_);
lean_ctor_set_uint8(v___x_586_, sizeof(void*)*1, v___x_585_);
v___x_587_ = l_Repr_addAppParen(v___x_586_, v_prec_517_);
return v___x_587_;
}
v___jp_588_:
{
lean_object* v___x_590_; lean_object* v___x_591_; uint8_t v___x_592_; lean_object* v___x_593_; lean_object* v___x_594_; 
v___x_590_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__21));
lean_inc(v___y_589_);
v___x_591_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_591_, 0, v___y_589_);
lean_ctor_set(v___x_591_, 1, v___x_590_);
v___x_592_ = 0;
v___x_593_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_593_, 0, v___x_591_);
lean_ctor_set_uint8(v___x_593_, sizeof(void*)*1, v___x_592_);
v___x_594_ = l_Repr_addAppParen(v___x_593_, v_prec_517_);
return v___x_594_;
}
v___jp_595_:
{
lean_object* v___x_597_; lean_object* v___x_598_; uint8_t v___x_599_; lean_object* v___x_600_; lean_object* v___x_601_; 
v___x_597_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprErrorCode_repr___closed__23));
lean_inc(v___y_596_);
v___x_598_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_598_, 0, v___y_596_);
lean_ctor_set(v___x_598_, 1, v___x_597_);
v___x_599_ = 0;
v___x_600_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_600_, 0, v___x_598_);
lean_ctor_set_uint8(v___x_600_, sizeof(void*)*1, v___x_599_);
v___x_601_ = l_Repr_addAppParen(v___x_600_, v_prec_517_);
return v___x_601_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprErrorCode_repr___boxed(lean_object* v_x_650_, lean_object* v_prec_651_){
_start:
{
uint8_t v_x_677__boxed_652_; lean_object* v_res_653_; 
v_x_677__boxed_652_ = lean_unbox(v_x_650_);
v_res_653_ = lp_algalVerification_Algal_Replay_instReprErrorCode_repr(v_x_677__boxed_652_, v_prec_651_);
lean_dec(v_prec_651_);
return v_res_653_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqErrorCode_beq(uint8_t v_x_656_, uint8_t v_y_657_){
_start:
{
lean_object* v___x_658_; lean_object* v___x_659_; uint8_t v___x_660_; 
v___x_658_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(v_x_656_);
v___x_659_ = lp_algalVerification_Algal_Replay_ErrorCode_ctorIdx(v_y_657_);
v___x_660_ = lean_nat_dec_eq(v___x_658_, v___x_659_);
lean_dec(v___x_659_);
lean_dec(v___x_658_);
return v___x_660_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqErrorCode_beq___boxed(lean_object* v_x_661_, lean_object* v_y_662_){
_start:
{
uint8_t v_x_17__boxed_663_; uint8_t v_y_18__boxed_664_; uint8_t v_res_665_; lean_object* v_r_666_; 
v_x_17__boxed_663_ = lean_unbox(v_x_661_);
v_y_18__boxed_664_ = lean_unbox(v_y_662_);
v_res_665_ = lp_algalVerification_Algal_Replay_instBEqErrorCode_beq(v_x_17__boxed_663_, v_y_18__boxed_664_);
v_r_666_ = lean_box(v_res_665_);
return v_r_666_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorIdx(lean_object* v_x_669_){
_start:
{
switch(lean_obj_tag(v_x_669_))
{
case 0:
{
lean_object* v___x_670_; 
v___x_670_ = lean_unsigned_to_nat(0u);
return v___x_670_;
}
case 1:
{
lean_object* v___x_671_; 
v___x_671_ = lean_unsigned_to_nat(1u);
return v___x_671_;
}
default: 
{
lean_object* v___x_672_; 
v___x_672_ = lean_unsigned_to_nat(2u);
return v___x_672_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorIdx___boxed(lean_object* v_x_673_){
_start:
{
lean_object* v_res_674_; 
v_res_674_ = lp_algalVerification_Algal_Replay_Reply_ctorIdx(v_x_673_);
lean_dec(v_x_673_);
return v_res_674_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(lean_object* v_t_675_, lean_object* v_k_676_){
_start:
{
switch(lean_obj_tag(v_t_675_))
{
case 0:
{
lean_object* v_a_677_; lean_object* v___x_678_; 
v_a_677_ = lean_ctor_get(v_t_675_, 0);
lean_inc(v_a_677_);
lean_dec_ref_known(v_t_675_, 1);
v___x_678_ = lean_apply_1(v_k_676_, v_a_677_);
return v___x_678_;
}
case 1:
{
uint8_t v_a_679_; lean_object* v___x_680_; lean_object* v___x_681_; 
v_a_679_ = lean_ctor_get_uint8(v_t_675_, 0);
lean_dec_ref_known(v_t_675_, 0);
v___x_680_ = lean_box(v_a_679_);
v___x_681_ = lean_apply_1(v_k_676_, v___x_680_);
return v___x_681_;
}
default: 
{
return v_k_676_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim(lean_object* v_motive_682_, lean_object* v_ctorIdx_683_, lean_object* v_t_684_, lean_object* v_h_685_, lean_object* v_k_686_){
_start:
{
lean_object* v___x_687_; 
v___x_687_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_684_, v_k_686_);
return v___x_687_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_ctorElim___boxed(lean_object* v_motive_688_, lean_object* v_ctorIdx_689_, lean_object* v_t_690_, lean_object* v_h_691_, lean_object* v_k_692_){
_start:
{
lean_object* v_res_693_; 
v_res_693_ = lp_algalVerification_Algal_Replay_Reply_ctorElim(v_motive_688_, v_ctorIdx_689_, v_t_690_, v_h_691_, v_k_692_);
lean_dec(v_ctorIdx_689_);
return v_res_693_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_output_elim___redArg(lean_object* v_t_694_, lean_object* v_output_695_){
_start:
{
lean_object* v___x_696_; 
v___x_696_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_694_, v_output_695_);
return v___x_696_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_output_elim(lean_object* v_motive_697_, lean_object* v_t_698_, lean_object* v_h_699_, lean_object* v_output_700_){
_start:
{
lean_object* v___x_701_; 
v___x_701_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_698_, v_output_700_);
return v___x_701_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_failure_elim___redArg(lean_object* v_t_702_, lean_object* v_failure_703_){
_start:
{
lean_object* v___x_704_; 
v___x_704_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_702_, v_failure_703_);
return v___x_704_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_failure_elim(lean_object* v_motive_705_, lean_object* v_t_706_, lean_object* v_h_707_, lean_object* v_failure_708_){
_start:
{
lean_object* v___x_709_; 
v___x_709_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_706_, v_failure_708_);
return v___x_709_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_suspended_elim___redArg(lean_object* v_t_710_, lean_object* v_suspended_711_){
_start:
{
lean_object* v___x_712_; 
v___x_712_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_710_, v_suspended_711_);
return v___x_712_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Reply_suspended_elim(lean_object* v_motive_713_, lean_object* v_t_714_, lean_object* v_h_715_, lean_object* v_suspended_716_){
_start:
{
lean_object* v___x_717_; 
v___x_717_ = lp_algalVerification_Algal_Replay_Reply_ctorElim___redArg(v_t_714_, v_suspended_716_);
return v___x_717_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq(lean_object* v_x_718_, lean_object* v_x_719_){
_start:
{
switch(lean_obj_tag(v_x_718_))
{
case 0:
{
lean_object* v_a_720_; uint8_t v___x_721_; 
v_a_720_ = lean_ctor_get(v_x_718_, 0);
v___x_721_ = 0;
if (lean_obj_tag(v_x_719_) == 0)
{
lean_object* v_a_722_; uint8_t v___x_723_; 
v_a_722_ = lean_ctor_get(v_x_719_, 0);
v___x_723_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_a_720_, v_a_722_);
if (v___x_723_ == 0)
{
return v___x_721_;
}
else
{
return v___x_723_;
}
}
else
{
return v___x_721_;
}
}
case 1:
{
uint8_t v_a_724_; uint8_t v___x_725_; 
v_a_724_ = lean_ctor_get_uint8(v_x_718_, 0);
v___x_725_ = 0;
if (lean_obj_tag(v_x_719_) == 1)
{
uint8_t v_a_726_; uint8_t v___x_727_; 
v_a_726_ = lean_ctor_get_uint8(v_x_719_, 0);
v___x_727_ = lp_algalVerification_Algal_Replay_instDecidableEqErrorCode(v_a_724_, v_a_726_);
if (v___x_727_ == 0)
{
return v___x_725_;
}
else
{
return v___x_727_;
}
}
else
{
return v___x_725_;
}
}
default: 
{
if (lean_obj_tag(v_x_719_) == 2)
{
uint8_t v___x_728_; 
v___x_728_ = 1;
return v___x_728_;
}
else
{
uint8_t v___x_729_; 
v___x_729_ = 0;
return v___x_729_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq___boxed(lean_object* v_x_730_, lean_object* v_x_731_){
_start:
{
uint8_t v_res_732_; lean_object* v_r_733_; 
v_res_732_ = lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq(v_x_730_, v_x_731_);
lean_dec(v_x_731_);
lean_dec(v_x_730_);
v_r_733_ = lean_box(v_res_732_);
return v_r_733_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReply(lean_object* v_x_734_, lean_object* v_x_735_){
_start:
{
uint8_t v___x_736_; 
v___x_736_ = lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq(v_x_734_, v_x_735_);
return v___x_736_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReply___boxed(lean_object* v_x_737_, lean_object* v_x_738_){
_start:
{
uint8_t v_res_739_; lean_object* v_r_740_; 
v_res_739_ = lp_algalVerification_Algal_Replay_instDecidableEqReply(v_x_737_, v_x_738_);
lean_dec(v_x_738_);
lean_dec(v_x_737_);
v_r_740_ = lean_box(v_res_739_);
return v_r_740_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq(lean_object* v_x_741_, lean_object* v_x_742_){
_start:
{
lean_object* v_executor_743_; lean_object* v_usage_744_; uint8_t v_cached_745_; uint8_t v_nonRetryable_746_; lean_object* v_wake_747_; lean_object* v_configuration_748_; lean_object* v_executor_749_; lean_object* v_usage_750_; uint8_t v_cached_751_; uint8_t v_nonRetryable_752_; lean_object* v_wake_753_; lean_object* v_configuration_754_; uint8_t v___x_760_; 
v_executor_743_ = lean_ctor_get(v_x_741_, 0);
lean_inc_ref(v_executor_743_);
v_usage_744_ = lean_ctor_get(v_x_741_, 1);
lean_inc(v_usage_744_);
v_cached_745_ = lean_ctor_get_uint8(v_x_741_, sizeof(void*)*4);
v_nonRetryable_746_ = lean_ctor_get_uint8(v_x_741_, sizeof(void*)*4 + 1);
v_wake_747_ = lean_ctor_get(v_x_741_, 2);
lean_inc(v_wake_747_);
v_configuration_748_ = lean_ctor_get(v_x_741_, 3);
lean_inc(v_configuration_748_);
lean_dec_ref(v_x_741_);
v_executor_749_ = lean_ctor_get(v_x_742_, 0);
lean_inc_ref(v_executor_749_);
v_usage_750_ = lean_ctor_get(v_x_742_, 1);
lean_inc(v_usage_750_);
v_cached_751_ = lean_ctor_get_uint8(v_x_742_, sizeof(void*)*4);
v_nonRetryable_752_ = lean_ctor_get_uint8(v_x_742_, sizeof(void*)*4 + 1);
v_wake_753_ = lean_ctor_get(v_x_742_, 2);
lean_inc(v_wake_753_);
v_configuration_754_ = lean_ctor_get(v_x_742_, 3);
lean_inc(v_configuration_754_);
lean_dec_ref(v_x_742_);
v___x_760_ = lean_string_dec_eq(v_executor_743_, v_executor_749_);
lean_dec_ref(v_executor_749_);
lean_dec_ref(v_executor_743_);
if (v___x_760_ == 0)
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_usage_750_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
lean_dec(v_usage_744_);
return v___x_760_;
}
else
{
lean_object* v___x_761_; uint8_t v___x_762_; 
v___x_761_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed), 2, 0);
v___x_762_ = l_Option_instDecidableEq___redArg(v___x_761_, v_usage_744_, v_usage_750_);
if (v___x_762_ == 0)
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
return v___x_762_;
}
else
{
if (v_cached_745_ == 0)
{
if (v_cached_751_ == 0)
{
goto v___jp_759_;
}
else
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
return v_cached_745_;
}
}
else
{
if (v_cached_751_ == 0)
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
return v_cached_751_;
}
else
{
goto v___jp_759_;
}
}
}
}
v___jp_755_:
{
lean_object* v___x_756_; uint8_t v___x_757_; 
v___x_756_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
lean_inc_ref(v___x_756_);
v___x_757_ = l_instDecidableEqList___redArg(v___x_756_, v_wake_747_, v_wake_753_);
if (v___x_757_ == 0)
{
lean_dec_ref(v___x_756_);
lean_dec(v_configuration_754_);
lean_dec(v_configuration_748_);
return v___x_757_;
}
else
{
uint8_t v___x_758_; 
v___x_758_ = l_Option_instDecidableEq___redArg(v___x_756_, v_configuration_748_, v_configuration_754_);
return v___x_758_;
}
}
v___jp_759_:
{
if (v_nonRetryable_746_ == 0)
{
if (v_nonRetryable_752_ == 0)
{
goto v___jp_755_;
}
else
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
return v_nonRetryable_746_;
}
}
else
{
if (v_nonRetryable_752_ == 0)
{
lean_dec(v_configuration_754_);
lean_dec(v_wake_753_);
lean_dec(v_configuration_748_);
lean_dec(v_wake_747_);
return v_nonRetryable_752_;
}
else
{
goto v___jp_755_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq___boxed(lean_object* v_x_763_, lean_object* v_x_764_){
_start:
{
uint8_t v_res_765_; lean_object* v_r_766_; 
v_res_765_ = lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq(v_x_763_, v_x_764_);
v_r_766_ = lean_box(v_res_765_);
return v_r_766_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMeta(lean_object* v_x_767_, lean_object* v_x_768_){
_start:
{
uint8_t v___x_769_; 
v___x_769_ = lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq(v_x_767_, v_x_768_);
return v___x_769_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMeta___boxed(lean_object* v_x_770_, lean_object* v_x_771_){
_start:
{
uint8_t v_res_772_; lean_object* v_r_773_; 
v_res_772_ = lp_algalVerification_Algal_Replay_instDecidableEqMeta(v_x_770_, v_x_771_);
v_r_773_ = lean_box(v_res_772_);
return v_r_773_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(lean_object* v_x_774_, lean_object* v_x_775_){
_start:
{
lean_object* v_cell_776_; uint8_t v_kind_777_; lean_object* v_payload_778_; lean_object* v_cell_779_; uint8_t v_kind_780_; lean_object* v_payload_781_; uint8_t v___x_782_; 
v_cell_776_ = lean_ctor_get(v_x_774_, 0);
v_kind_777_ = lean_ctor_get_uint8(v_x_774_, sizeof(void*)*2);
v_payload_778_ = lean_ctor_get(v_x_774_, 1);
v_cell_779_ = lean_ctor_get(v_x_775_, 0);
v_kind_780_ = lean_ctor_get_uint8(v_x_775_, sizeof(void*)*2);
v_payload_781_ = lean_ctor_get(v_x_775_, 1);
v___x_782_ = lean_string_dec_eq(v_cell_776_, v_cell_779_);
if (v___x_782_ == 0)
{
return v___x_782_;
}
else
{
uint8_t v___x_783_; 
v___x_783_ = lp_algalVerification_Algal_Replay_instDecidableEqKind(v_kind_777_, v_kind_780_);
if (v___x_783_ == 0)
{
return v___x_783_;
}
else
{
uint8_t v___x_784_; 
v___x_784_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_payload_778_, v_payload_781_);
return v___x_784_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq___boxed(lean_object* v_x_785_, lean_object* v_x_786_){
_start:
{
uint8_t v_res_787_; lean_object* v_r_788_; 
v_res_787_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_x_785_, v_x_786_);
lean_dec_ref(v_x_786_);
lean_dec_ref(v_x_785_);
v_r_788_ = lean_box(v_res_787_);
return v_r_788_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRequest(lean_object* v_x_789_, lean_object* v_x_790_){
_start:
{
uint8_t v___x_791_; 
v___x_791_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_x_789_, v_x_790_);
return v___x_791_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRequest___boxed(lean_object* v_x_792_, lean_object* v_x_793_){
_start:
{
uint8_t v_res_794_; lean_object* v_r_795_; 
v_res_794_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest(v_x_792_, v_x_793_);
lean_dec_ref(v_x_793_);
lean_dec_ref(v_x_792_);
v_r_795_ = lean_box(v_res_794_);
return v_r_795_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq(lean_object* v_x_796_, lean_object* v_x_797_){
_start:
{
lean_object* v_request_798_; lean_object* v_reply_799_; lean_object* v_receiptMeta_800_; lean_object* v_request_801_; lean_object* v_reply_802_; lean_object* v_receiptMeta_803_; uint8_t v___x_804_; 
v_request_798_ = lean_ctor_get(v_x_796_, 0);
lean_inc_ref(v_request_798_);
v_reply_799_ = lean_ctor_get(v_x_796_, 1);
lean_inc(v_reply_799_);
v_receiptMeta_800_ = lean_ctor_get(v_x_796_, 2);
lean_inc_ref(v_receiptMeta_800_);
lean_dec_ref(v_x_796_);
v_request_801_ = lean_ctor_get(v_x_797_, 0);
lean_inc_ref(v_request_801_);
v_reply_802_ = lean_ctor_get(v_x_797_, 1);
lean_inc(v_reply_802_);
v_receiptMeta_803_ = lean_ctor_get(v_x_797_, 2);
lean_inc_ref(v_receiptMeta_803_);
lean_dec_ref(v_x_797_);
v___x_804_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_request_798_, v_request_801_);
lean_dec_ref(v_request_801_);
lean_dec_ref(v_request_798_);
if (v___x_804_ == 0)
{
lean_dec_ref(v_receiptMeta_803_);
lean_dec(v_reply_802_);
lean_dec_ref(v_receiptMeta_800_);
lean_dec(v_reply_799_);
return v___x_804_;
}
else
{
uint8_t v___x_805_; 
v___x_805_ = lp_algalVerification_Algal_Replay_instDecidableEqReply_decEq(v_reply_799_, v_reply_802_);
lean_dec(v_reply_802_);
lean_dec(v_reply_799_);
if (v___x_805_ == 0)
{
lean_dec_ref(v_receiptMeta_803_);
lean_dec_ref(v_receiptMeta_800_);
return v___x_805_;
}
else
{
uint8_t v___x_806_; 
v___x_806_ = lp_algalVerification_Algal_Replay_instDecidableEqMeta_decEq(v_receiptMeta_800_, v_receiptMeta_803_);
return v___x_806_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq___boxed(lean_object* v_x_807_, lean_object* v_x_808_){
_start:
{
uint8_t v_res_809_; lean_object* v_r_810_; 
v_res_809_ = lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq(v_x_807_, v_x_808_);
v_r_810_ = lean_box(v_res_809_);
return v_r_810_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord(lean_object* v_x_811_, lean_object* v_x_812_){
_start:
{
uint8_t v___x_813_; 
v___x_813_ = lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord_decEq(v_x_811_, v_x_812_);
return v___x_813_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed(lean_object* v_x_814_, lean_object* v_x_815_){
_start:
{
uint8_t v_res_816_; lean_object* v_r_817_; 
v_res_816_ = lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord(v_x_814_, v_x_815_);
v_r_817_ = lean_box(v_res_816_);
return v_r_817_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serve(lean_object* v_x_818_, lean_object* v_x_819_){
_start:
{
if (lean_obj_tag(v_x_818_) == 0)
{
lean_object* v___x_820_; 
v___x_820_ = lean_box(0);
return v___x_820_;
}
else
{
lean_object* v_head_821_; lean_object* v_tail_822_; lean_object* v___x_824_; uint8_t v_isShared_825_; uint8_t v_isSharedCheck_851_; 
v_head_821_ = lean_ctor_get(v_x_818_, 0);
v_tail_822_ = lean_ctor_get(v_x_818_, 1);
v_isSharedCheck_851_ = !lean_is_exclusive(v_x_818_);
if (v_isSharedCheck_851_ == 0)
{
v___x_824_ = v_x_818_;
v_isShared_825_ = v_isSharedCheck_851_;
goto v_resetjp_823_;
}
else
{
lean_inc(v_tail_822_);
lean_inc(v_head_821_);
lean_dec(v_x_818_);
v___x_824_ = lean_box(0);
v_isShared_825_ = v_isSharedCheck_851_;
goto v_resetjp_823_;
}
v_resetjp_823_:
{
lean_object* v_request_826_; uint8_t v___x_827_; 
v_request_826_ = lean_ctor_get(v_head_821_, 0);
v___x_827_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_request_826_, v_x_819_);
if (v___x_827_ == 0)
{
lean_object* v___x_828_; 
v___x_828_ = lp_algalVerification_Algal_Replay_serve(v_tail_822_, v_x_819_);
if (lean_obj_tag(v___x_828_) == 0)
{
lean_del_object(v___x_824_);
lean_dec(v_head_821_);
return v___x_828_;
}
else
{
lean_object* v_val_829_; lean_object* v___x_831_; uint8_t v_isShared_832_; uint8_t v_isSharedCheck_848_; 
v_val_829_ = lean_ctor_get(v___x_828_, 0);
v_isSharedCheck_848_ = !lean_is_exclusive(v___x_828_);
if (v_isSharedCheck_848_ == 0)
{
v___x_831_ = v___x_828_;
v_isShared_832_ = v_isSharedCheck_848_;
goto v_resetjp_830_;
}
else
{
lean_inc(v_val_829_);
lean_dec(v___x_828_);
v___x_831_ = lean_box(0);
v_isShared_832_ = v_isSharedCheck_848_;
goto v_resetjp_830_;
}
v_resetjp_830_:
{
lean_object* v_fst_833_; lean_object* v_snd_834_; lean_object* v___x_836_; uint8_t v_isShared_837_; uint8_t v_isSharedCheck_847_; 
v_fst_833_ = lean_ctor_get(v_val_829_, 0);
v_snd_834_ = lean_ctor_get(v_val_829_, 1);
v_isSharedCheck_847_ = !lean_is_exclusive(v_val_829_);
if (v_isSharedCheck_847_ == 0)
{
v___x_836_ = v_val_829_;
v_isShared_837_ = v_isSharedCheck_847_;
goto v_resetjp_835_;
}
else
{
lean_inc(v_snd_834_);
lean_inc(v_fst_833_);
lean_dec(v_val_829_);
v___x_836_ = lean_box(0);
v_isShared_837_ = v_isSharedCheck_847_;
goto v_resetjp_835_;
}
v_resetjp_835_:
{
lean_object* v___x_839_; 
if (v_isShared_825_ == 0)
{
lean_ctor_set(v___x_824_, 1, v_snd_834_);
v___x_839_ = v___x_824_;
goto v_reusejp_838_;
}
else
{
lean_object* v_reuseFailAlloc_846_; 
v_reuseFailAlloc_846_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_846_, 0, v_head_821_);
lean_ctor_set(v_reuseFailAlloc_846_, 1, v_snd_834_);
v___x_839_ = v_reuseFailAlloc_846_;
goto v_reusejp_838_;
}
v_reusejp_838_:
{
lean_object* v___x_841_; 
if (v_isShared_837_ == 0)
{
lean_ctor_set(v___x_836_, 1, v___x_839_);
v___x_841_ = v___x_836_;
goto v_reusejp_840_;
}
else
{
lean_object* v_reuseFailAlloc_845_; 
v_reuseFailAlloc_845_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_845_, 0, v_fst_833_);
lean_ctor_set(v_reuseFailAlloc_845_, 1, v___x_839_);
v___x_841_ = v_reuseFailAlloc_845_;
goto v_reusejp_840_;
}
v_reusejp_840_:
{
lean_object* v___x_843_; 
if (v_isShared_832_ == 0)
{
lean_ctor_set(v___x_831_, 0, v___x_841_);
v___x_843_ = v___x_831_;
goto v_reusejp_842_;
}
else
{
lean_object* v_reuseFailAlloc_844_; 
v_reuseFailAlloc_844_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_844_, 0, v___x_841_);
v___x_843_ = v_reuseFailAlloc_844_;
goto v_reusejp_842_;
}
v_reusejp_842_:
{
return v___x_843_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_849_; lean_object* v___x_850_; 
lean_del_object(v___x_824_);
v___x_849_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_849_, 0, v_head_821_);
lean_ctor_set(v___x_849_, 1, v_tail_822_);
v___x_850_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_850_, 0, v___x_849_);
return v___x_850_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serve___boxed(lean_object* v_x_852_, lean_object* v_x_853_){
_start:
{
lean_object* v_res_854_; 
v_res_854_ = lp_algalVerification_Algal_Replay_serve(v_x_852_, v_x_853_);
lean_dec_ref(v_x_853_);
return v_res_854_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_serves(lean_object* v_tape_855_, lean_object* v_req_856_){
_start:
{
lean_object* v___x_857_; 
v___x_857_ = lp_algalVerification_Algal_Replay_serve(v_tape_855_, v_req_856_);
if (lean_obj_tag(v___x_857_) == 0)
{
uint8_t v___x_858_; 
v___x_858_ = 0;
return v___x_858_;
}
else
{
uint8_t v___x_859_; 
lean_dec_ref_known(v___x_857_, 1);
v___x_859_ = 1;
return v___x_859_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_serves___boxed(lean_object* v_tape_860_, lean_object* v_req_861_){
_start:
{
uint8_t v_res_862_; lean_object* v_r_863_; 
v_res_862_ = lp_algalVerification_Algal_Replay_serves(v_tape_860_, v_req_861_);
lean_dec_ref(v_req_861_);
v_r_863_ = lean_box(v_res_862_);
return v_r_863_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0(lean_object* v_req_864_, lean_object* v_a_865_, lean_object* v_a_866_){
_start:
{
if (lean_obj_tag(v_a_865_) == 0)
{
lean_object* v___x_867_; 
v___x_867_ = l_List_reverse___redArg(v_a_866_);
return v___x_867_;
}
else
{
lean_object* v_head_868_; lean_object* v_tail_869_; lean_object* v___x_871_; uint8_t v_isShared_872_; uint8_t v_isSharedCheck_880_; 
v_head_868_ = lean_ctor_get(v_a_865_, 0);
v_tail_869_ = lean_ctor_get(v_a_865_, 1);
v_isSharedCheck_880_ = !lean_is_exclusive(v_a_865_);
if (v_isSharedCheck_880_ == 0)
{
v___x_871_ = v_a_865_;
v_isShared_872_ = v_isSharedCheck_880_;
goto v_resetjp_870_;
}
else
{
lean_inc(v_tail_869_);
lean_inc(v_head_868_);
lean_dec(v_a_865_);
v___x_871_ = lean_box(0);
v_isShared_872_ = v_isSharedCheck_880_;
goto v_resetjp_870_;
}
v_resetjp_870_:
{
lean_object* v_request_873_; uint8_t v___x_874_; 
v_request_873_ = lean_ctor_get(v_head_868_, 0);
v___x_874_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_request_873_, v_req_864_);
if (v___x_874_ == 0)
{
lean_del_object(v___x_871_);
lean_dec(v_head_868_);
v_a_865_ = v_tail_869_;
goto _start;
}
else
{
lean_object* v___x_877_; 
if (v_isShared_872_ == 0)
{
lean_ctor_set(v___x_871_, 1, v_a_866_);
v___x_877_ = v___x_871_;
goto v_reusejp_876_;
}
else
{
lean_object* v_reuseFailAlloc_879_; 
v_reuseFailAlloc_879_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_879_, 0, v_head_868_);
lean_ctor_set(v_reuseFailAlloc_879_, 1, v_a_866_);
v___x_877_ = v_reuseFailAlloc_879_;
goto v_reusejp_876_;
}
v_reusejp_876_:
{
v_a_865_ = v_tail_869_;
v_a_866_ = v___x_877_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0___boxed(lean_object* v_req_881_, lean_object* v_a_882_, lean_object* v_a_883_){
_start:
{
lean_object* v_res_884_; 
v_res_884_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0(v_req_881_, v_a_882_, v_a_883_);
lean_dec_ref(v_req_881_);
return v_res_884_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_occurrences(lean_object* v_tape_885_, lean_object* v_req_886_){
_start:
{
lean_object* v___x_887_; lean_object* v___x_888_; 
v___x_887_ = lean_box(0);
v___x_888_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_occurrences_spec__0(v_req_886_, v_tape_885_, v___x_887_);
return v___x_888_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_occurrences___boxed(lean_object* v_tape_889_, lean_object* v_req_890_){
_start:
{
lean_object* v_res_891_; 
v_res_891_ = lp_algalVerification_Algal_Replay_occurrences(v_tape_889_, v_req_890_);
lean_dec_ref(v_req_890_);
return v_res_891_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_dropSuspended_spec__0(lean_object* v_a_892_, lean_object* v_a_893_){
_start:
{
if (lean_obj_tag(v_a_892_) == 0)
{
lean_object* v___x_894_; 
v___x_894_ = l_List_reverse___redArg(v_a_893_);
return v___x_894_;
}
else
{
lean_object* v_head_895_; lean_object* v_reply_896_; 
v_head_895_ = lean_ctor_get(v_a_892_, 0);
v_reply_896_ = lean_ctor_get(v_head_895_, 1);
if (lean_obj_tag(v_reply_896_) == 2)
{
lean_object* v_tail_897_; 
v_tail_897_ = lean_ctor_get(v_a_892_, 1);
lean_inc(v_tail_897_);
lean_dec_ref_known(v_a_892_, 2);
v_a_892_ = v_tail_897_;
goto _start;
}
else
{
lean_object* v_tail_899_; lean_object* v___x_901_; uint8_t v_isShared_902_; uint8_t v_isSharedCheck_907_; 
lean_inc(v_head_895_);
v_tail_899_ = lean_ctor_get(v_a_892_, 1);
v_isSharedCheck_907_ = !lean_is_exclusive(v_a_892_);
if (v_isSharedCheck_907_ == 0)
{
lean_object* v_unused_908_; 
v_unused_908_ = lean_ctor_get(v_a_892_, 0);
lean_dec(v_unused_908_);
v___x_901_ = v_a_892_;
v_isShared_902_ = v_isSharedCheck_907_;
goto v_resetjp_900_;
}
else
{
lean_inc(v_tail_899_);
lean_dec(v_a_892_);
v___x_901_ = lean_box(0);
v_isShared_902_ = v_isSharedCheck_907_;
goto v_resetjp_900_;
}
v_resetjp_900_:
{
lean_object* v___x_904_; 
if (v_isShared_902_ == 0)
{
lean_ctor_set(v___x_901_, 1, v_a_893_);
v___x_904_ = v___x_901_;
goto v_reusejp_903_;
}
else
{
lean_object* v_reuseFailAlloc_906_; 
v_reuseFailAlloc_906_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_906_, 0, v_head_895_);
lean_ctor_set(v_reuseFailAlloc_906_, 1, v_a_893_);
v___x_904_ = v_reuseFailAlloc_906_;
goto v_reusejp_903_;
}
v_reusejp_903_:
{
v_a_892_ = v_tail_899_;
v_a_893_ = v___x_904_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_dropSuspended(lean_object* v_tape_909_){
_start:
{
lean_object* v___x_910_; lean_object* v___x_911_; 
v___x_910_ = lean_box(0);
v___x_911_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Replay_dropSuspended_spec__0(v_tape_909_, v___x_910_);
return v___x_911_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noLive(lean_object* v_x_912_){
_start:
{
lean_object* v___x_913_; 
v___x_913_ = lean_box(0);
return v___x_913_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noLive___boxed(lean_object* v_x_914_){
_start:
{
lean_object* v_res_915_; 
v_res_915_ = lp_algalVerification_Algal_Replay_noLive(v_x_914_);
lean_dec_ref(v_x_914_);
return v_res_915_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_unboundRecord(lean_object* v_req_924_){
_start:
{
lean_object* v___x_925_; lean_object* v___x_926_; lean_object* v___x_927_; 
v___x_925_ = ((lean_object*)(lp_algalVerification_Algal_Replay_unboundRecord___closed__0));
v___x_926_ = ((lean_object*)(lp_algalVerification_Algal_Replay_unboundRecord___closed__2));
v___x_927_ = lean_alloc_ctor(0, 3, 0);
lean_ctor_set(v___x_927_, 0, v_req_924_);
lean_ctor_set(v___x_927_, 1, v___x_925_);
lean_ctor_set(v___x_927_, 2, v___x_926_);
return v___x_927_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noRecordedSlots(lean_object* v_x_928_){
_start:
{
lean_object* v___x_929_; 
v___x_929_ = lean_box(0);
return v___x_929_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_noRecordedSlots___boxed(lean_object* v_x_930_){
_start:
{
lean_object* v_res_931_; 
v_res_931_ = lp_algalVerification_Algal_Replay_noRecordedSlots(v_x_930_);
lean_dec_ref(v_x_930_);
return v_res_931_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_dispatch(lean_object* v_cfg_932_, lean_object* v_tape_933_, lean_object* v_req_934_){
_start:
{
lean_object* v___x_951_; 
lean_inc(v_tape_933_);
v___x_951_ = lp_algalVerification_Algal_Replay_serve(v_tape_933_, v_req_934_);
if (lean_obj_tag(v___x_951_) == 0)
{
uint8_t v_kind_952_; uint8_t v___x_953_; uint8_t v___x_954_; 
v_kind_952_ = lean_ctor_get_uint8(v_req_934_, sizeof(void*)*2);
v___x_953_ = 5;
v___x_954_ = lp_algalVerification_Algal_Replay_instDecidableEqKind(v_kind_952_, v___x_953_);
if (v___x_954_ == 0)
{
goto v___jp_935_;
}
else
{
uint8_t v_toolArmed_955_; 
v_toolArmed_955_ = lean_ctor_get_uint8(v_cfg_932_, sizeof(void*)*4);
if (v_toolArmed_955_ == 0)
{
goto v___jp_935_;
}
else
{
uint8_t v_toolFallthrough_956_; 
v_toolFallthrough_956_ = lean_ctor_get_uint8(v_cfg_932_, sizeof(void*)*4 + 1);
if (v_toolFallthrough_956_ == 0)
{
lean_object* v___x_957_; lean_object* v___x_958_; 
lean_dec_ref(v_cfg_932_);
v___x_957_ = lp_algalVerification_Algal_Replay_unboundRecord(v_req_934_);
v___x_958_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_958_, 0, v___x_957_);
lean_ctor_set(v___x_958_, 1, v_tape_933_);
return v___x_958_;
}
else
{
goto v___jp_935_;
}
}
}
}
else
{
lean_object* v_val_959_; 
lean_dec_ref(v_req_934_);
lean_dec(v_tape_933_);
lean_dec_ref(v_cfg_932_);
v_val_959_ = lean_ctor_get(v___x_951_, 0);
lean_inc(v_val_959_);
lean_dec_ref_known(v___x_951_, 1);
return v_val_959_;
}
v___jp_935_:
{
lean_object* v_live_936_; lean_object* v___x_937_; 
v_live_936_ = lean_ctor_get(v_cfg_932_, 0);
lean_inc_ref(v_live_936_);
lean_dec_ref(v_cfg_932_);
lean_inc_ref(v_req_934_);
v___x_937_ = lean_apply_1(v_live_936_, v_req_934_);
if (lean_obj_tag(v___x_937_) == 0)
{
lean_object* v___x_938_; lean_object* v___x_939_; 
v___x_938_ = lp_algalVerification_Algal_Replay_unboundRecord(v_req_934_);
v___x_939_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_939_, 0, v___x_938_);
lean_ctor_set(v___x_939_, 1, v_tape_933_);
return v___x_939_;
}
else
{
lean_object* v_val_940_; lean_object* v_fst_941_; lean_object* v_snd_942_; lean_object* v___x_944_; uint8_t v_isShared_945_; uint8_t v_isSharedCheck_950_; 
v_val_940_ = lean_ctor_get(v___x_937_, 0);
lean_inc(v_val_940_);
lean_dec_ref_known(v___x_937_, 1);
v_fst_941_ = lean_ctor_get(v_val_940_, 0);
v_snd_942_ = lean_ctor_get(v_val_940_, 1);
v_isSharedCheck_950_ = !lean_is_exclusive(v_val_940_);
if (v_isSharedCheck_950_ == 0)
{
v___x_944_ = v_val_940_;
v_isShared_945_ = v_isSharedCheck_950_;
goto v_resetjp_943_;
}
else
{
lean_inc(v_snd_942_);
lean_inc(v_fst_941_);
lean_dec(v_val_940_);
v___x_944_ = lean_box(0);
v_isShared_945_ = v_isSharedCheck_950_;
goto v_resetjp_943_;
}
v_resetjp_943_:
{
lean_object* v___x_946_; lean_object* v___x_948_; 
v___x_946_ = lean_alloc_ctor(0, 3, 0);
lean_ctor_set(v___x_946_, 0, v_req_934_);
lean_ctor_set(v___x_946_, 1, v_fst_941_);
lean_ctor_set(v___x_946_, 2, v_snd_942_);
if (v_isShared_945_ == 0)
{
lean_ctor_set(v___x_944_, 1, v_tape_933_);
lean_ctor_set(v___x_944_, 0, v___x_946_);
v___x_948_ = v___x_944_;
goto v_reusejp_947_;
}
else
{
lean_object* v_reuseFailAlloc_949_; 
v_reuseFailAlloc_949_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_949_, 0, v___x_946_);
lean_ctor_set(v_reuseFailAlloc_949_, 1, v_tape_933_);
v___x_948_ = v_reuseFailAlloc_949_;
goto v_reusejp_947_;
}
v_reusejp_947_:
{
return v___x_948_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resolveSlotRead(lean_object* v_cfg_962_, lean_object* v_table_963_, lean_object* v_path_964_, lean_object* v_name_965_){
_start:
{
lean_object* v_slots_968_; lean_object* v___x_969_; 
v_slots_968_ = lean_ctor_get(v_cfg_962_, 1);
lean_inc_ref(v_slots_968_);
lean_dec_ref(v_cfg_962_);
v___x_969_ = lean_apply_1(v_slots_968_, v_path_964_);
if (lean_obj_tag(v___x_969_) == 0)
{
lean_object* v___x_970_; 
v___x_970_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_table_963_, v_name_965_);
if (lean_obj_tag(v___x_970_) == 0)
{
goto v___jp_966_;
}
else
{
lean_object* v_val_971_; lean_object* v___x_973_; uint8_t v_isShared_974_; uint8_t v_isSharedCheck_978_; 
v_val_971_ = lean_ctor_get(v___x_970_, 0);
v_isSharedCheck_978_ = !lean_is_exclusive(v___x_970_);
if (v_isSharedCheck_978_ == 0)
{
v___x_973_ = v___x_970_;
v_isShared_974_ = v_isSharedCheck_978_;
goto v_resetjp_972_;
}
else
{
lean_inc(v_val_971_);
lean_dec(v___x_970_);
v___x_973_ = lean_box(0);
v_isShared_974_ = v_isSharedCheck_978_;
goto v_resetjp_972_;
}
v_resetjp_972_:
{
lean_object* v___x_976_; 
if (v_isShared_974_ == 0)
{
lean_ctor_set_tag(v___x_973_, 0);
v___x_976_ = v___x_973_;
goto v_reusejp_975_;
}
else
{
lean_object* v_reuseFailAlloc_977_; 
v_reuseFailAlloc_977_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_977_, 0, v_val_971_);
v___x_976_ = v_reuseFailAlloc_977_;
goto v_reusejp_975_;
}
v_reusejp_975_:
{
return v___x_976_;
}
}
}
}
else
{
lean_object* v_val_979_; 
v_val_979_ = lean_ctor_get(v___x_969_, 0);
lean_inc(v_val_979_);
lean_dec_ref_known(v___x_969_, 1);
if (lean_obj_tag(v_val_979_) == 0)
{
goto v___jp_966_;
}
else
{
lean_object* v_val_980_; lean_object* v___x_982_; uint8_t v_isShared_983_; uint8_t v_isSharedCheck_987_; 
v_val_980_ = lean_ctor_get(v_val_979_, 0);
v_isSharedCheck_987_ = !lean_is_exclusive(v_val_979_);
if (v_isSharedCheck_987_ == 0)
{
v___x_982_ = v_val_979_;
v_isShared_983_ = v_isSharedCheck_987_;
goto v_resetjp_981_;
}
else
{
lean_inc(v_val_980_);
lean_dec(v_val_979_);
v___x_982_ = lean_box(0);
v_isShared_983_ = v_isSharedCheck_987_;
goto v_resetjp_981_;
}
v_resetjp_981_:
{
lean_object* v___x_985_; 
if (v_isShared_983_ == 0)
{
lean_ctor_set_tag(v___x_982_, 0);
v___x_985_ = v___x_982_;
goto v_reusejp_984_;
}
else
{
lean_object* v_reuseFailAlloc_986_; 
v_reuseFailAlloc_986_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_986_, 0, v_val_980_);
v___x_985_ = v_reuseFailAlloc_986_;
goto v_reusejp_984_;
}
v_reusejp_984_:
{
return v___x_985_;
}
}
}
}
v___jp_966_:
{
lean_object* v___x_967_; 
v___x_967_ = ((lean_object*)(lp_algalVerification_Algal_Replay_resolveSlotRead___closed__0));
return v___x_967_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resolveSlotRead___boxed(lean_object* v_cfg_988_, lean_object* v_table_989_, lean_object* v_path_990_, lean_object* v_name_991_){
_start:
{
lean_object* v_res_992_; 
v_res_992_ = lp_algalVerification_Algal_Replay_resolveSlotRead(v_cfg_988_, v_table_989_, v_path_990_, v_name_991_);
lean_dec_ref(v_name_991_);
lean_dec(v_table_989_);
return v_res_992_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(uint8_t v_x_993_){
_start:
{
if (v_x_993_ == 0)
{
lean_object* v___x_994_; 
v___x_994_ = lean_unsigned_to_nat(0u);
return v___x_994_;
}
else
{
lean_object* v___x_995_; 
v___x_995_ = lean_unsigned_to_nat(1u);
return v___x_995_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorIdx___boxed(lean_object* v_x_996_){
_start:
{
uint8_t v_x_boxed_997_; lean_object* v_res_998_; 
v_x_boxed_997_ = lean_unbox(v_x_996_);
v_res_998_ = lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(v_x_boxed_997_);
return v_res_998_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___redArg(lean_object* v_k_999_){
_start:
{
lean_inc(v_k_999_);
return v_k_999_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___redArg___boxed(lean_object* v_k_1000_){
_start:
{
lean_object* v_res_1001_; 
v_res_1001_ = lp_algalVerification_Algal_Replay_SlotMode_ctorElim___redArg(v_k_1000_);
lean_dec(v_k_1000_);
return v_res_1001_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim(lean_object* v_motive_1002_, lean_object* v_ctorIdx_1003_, uint8_t v_t_1004_, lean_object* v_h_1005_, lean_object* v_k_1006_){
_start:
{
lean_inc(v_k_1006_);
return v_k_1006_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ctorElim___boxed(lean_object* v_motive_1007_, lean_object* v_ctorIdx_1008_, lean_object* v_t_1009_, lean_object* v_h_1010_, lean_object* v_k_1011_){
_start:
{
uint8_t v_t_boxed_1012_; lean_object* v_res_1013_; 
v_t_boxed_1012_ = lean_unbox(v_t_1009_);
v_res_1013_ = lp_algalVerification_Algal_Replay_SlotMode_ctorElim(v_motive_1007_, v_ctorIdx_1008_, v_t_boxed_1012_, v_h_1010_, v_k_1011_);
lean_dec(v_k_1011_);
lean_dec(v_ctorIdx_1008_);
return v_res_1013_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___redArg(lean_object* v_read_1014_){
_start:
{
lean_inc(v_read_1014_);
return v_read_1014_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___redArg___boxed(lean_object* v_read_1015_){
_start:
{
lean_object* v_res_1016_; 
v_res_1016_ = lp_algalVerification_Algal_Replay_SlotMode_read_elim___redArg(v_read_1015_);
lean_dec(v_read_1015_);
return v_res_1016_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim(lean_object* v_motive_1017_, uint8_t v_t_1018_, lean_object* v_h_1019_, lean_object* v_read_1020_){
_start:
{
lean_inc(v_read_1020_);
return v_read_1020_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_read_elim___boxed(lean_object* v_motive_1021_, lean_object* v_t_1022_, lean_object* v_h_1023_, lean_object* v_read_1024_){
_start:
{
uint8_t v_t_boxed_1025_; lean_object* v_res_1026_; 
v_t_boxed_1025_ = lean_unbox(v_t_1022_);
v_res_1026_ = lp_algalVerification_Algal_Replay_SlotMode_read_elim(v_motive_1021_, v_t_boxed_1025_, v_h_1023_, v_read_1024_);
lean_dec(v_read_1024_);
return v_res_1026_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___redArg(lean_object* v_write_1027_){
_start:
{
lean_inc(v_write_1027_);
return v_write_1027_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___redArg___boxed(lean_object* v_write_1028_){
_start:
{
lean_object* v_res_1029_; 
v_res_1029_ = lp_algalVerification_Algal_Replay_SlotMode_write_elim___redArg(v_write_1028_);
lean_dec(v_write_1028_);
return v_res_1029_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim(lean_object* v_motive_1030_, uint8_t v_t_1031_, lean_object* v_h_1032_, lean_object* v_write_1033_){
_start:
{
lean_inc(v_write_1033_);
return v_write_1033_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_write_elim___boxed(lean_object* v_motive_1034_, lean_object* v_t_1035_, lean_object* v_h_1036_, lean_object* v_write_1037_){
_start:
{
uint8_t v_t_boxed_1038_; lean_object* v_res_1039_; 
v_t_boxed_1038_ = lean_unbox(v_t_1035_);
v_res_1039_ = lp_algalVerification_Algal_Replay_SlotMode_write_elim(v_motive_1034_, v_t_boxed_1038_, v_h_1036_, v_write_1037_);
lean_dec(v_write_1037_);
return v_res_1039_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_SlotMode_ofNat(lean_object* v_n_1040_){
_start:
{
lean_object* v___x_1041_; uint8_t v___x_1042_; 
v___x_1041_ = lean_unsigned_to_nat(0u);
v___x_1042_ = lean_nat_dec_le(v_n_1040_, v___x_1041_);
if (v___x_1042_ == 0)
{
uint8_t v___x_1043_; 
v___x_1043_ = 1;
return v___x_1043_;
}
else
{
uint8_t v___x_1044_; 
v___x_1044_ = 0;
return v___x_1044_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_SlotMode_ofNat___boxed(lean_object* v_n_1045_){
_start:
{
uint8_t v_res_1046_; lean_object* v_r_1047_; 
v_res_1046_ = lp_algalVerification_Algal_Replay_SlotMode_ofNat(v_n_1045_);
lean_dec(v_n_1045_);
v_r_1047_ = lean_box(v_res_1046_);
return v_r_1047_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSlotMode(uint8_t v_x_1048_, uint8_t v_y_1049_){
_start:
{
lean_object* v___x_1050_; lean_object* v___x_1051_; uint8_t v___x_1052_; 
v___x_1050_ = lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(v_x_1048_);
v___x_1051_ = lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(v_y_1049_);
v___x_1052_ = lean_nat_dec_eq(v___x_1050_, v___x_1051_);
lean_dec(v___x_1051_);
lean_dec(v___x_1050_);
return v___x_1052_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSlotMode___boxed(lean_object* v_x_1053_, lean_object* v_y_1054_){
_start:
{
uint8_t v_x_13__boxed_1055_; uint8_t v_y_14__boxed_1056_; uint8_t v_res_1057_; lean_object* v_r_1058_; 
v_x_13__boxed_1055_ = lean_unbox(v_x_1053_);
v_y_14__boxed_1056_ = lean_unbox(v_y_1054_);
v_res_1057_ = lp_algalVerification_Algal_Replay_instDecidableEqSlotMode(v_x_13__boxed_1055_, v_y_14__boxed_1056_);
v_r_1058_ = lean_box(v_res_1057_);
return v_r_1058_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr(uint8_t v_x_1065_, lean_object* v_prec_1066_){
_start:
{
lean_object* v___y_1068_; lean_object* v___y_1075_; 
if (v_x_1065_ == 0)
{
lean_object* v___x_1081_; uint8_t v___x_1082_; 
v___x_1081_ = lean_unsigned_to_nat(1024u);
v___x_1082_ = lean_nat_dec_le(v___x_1081_, v_prec_1066_);
if (v___x_1082_ == 0)
{
lean_object* v___x_1083_; 
v___x_1083_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1068_ = v___x_1083_;
goto v___jp_1067_;
}
else
{
lean_object* v___x_1084_; 
v___x_1084_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1068_ = v___x_1084_;
goto v___jp_1067_;
}
}
else
{
lean_object* v___x_1085_; uint8_t v___x_1086_; 
v___x_1085_ = lean_unsigned_to_nat(1024u);
v___x_1086_ = lean_nat_dec_le(v___x_1085_, v_prec_1066_);
if (v___x_1086_ == 0)
{
lean_object* v___x_1087_; 
v___x_1087_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1075_ = v___x_1087_;
goto v___jp_1074_;
}
else
{
lean_object* v___x_1088_; 
v___x_1088_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1075_ = v___x_1088_;
goto v___jp_1074_;
}
}
v___jp_1067_:
{
lean_object* v___x_1069_; lean_object* v___x_1070_; uint8_t v___x_1071_; lean_object* v___x_1072_; lean_object* v___x_1073_; 
v___x_1069_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__1));
lean_inc(v___y_1068_);
v___x_1070_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1070_, 0, v___y_1068_);
lean_ctor_set(v___x_1070_, 1, v___x_1069_);
v___x_1071_ = 0;
v___x_1072_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1072_, 0, v___x_1070_);
lean_ctor_set_uint8(v___x_1072_, sizeof(void*)*1, v___x_1071_);
v___x_1073_ = l_Repr_addAppParen(v___x_1072_, v_prec_1066_);
return v___x_1073_;
}
v___jp_1074_:
{
lean_object* v___x_1076_; lean_object* v___x_1077_; uint8_t v___x_1078_; lean_object* v___x_1079_; lean_object* v___x_1080_; 
v___x_1076_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprSlotMode_repr___closed__3));
lean_inc(v___y_1075_);
v___x_1077_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1077_, 0, v___y_1075_);
lean_ctor_set(v___x_1077_, 1, v___x_1076_);
v___x_1078_ = 0;
v___x_1079_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1079_, 0, v___x_1077_);
lean_ctor_set_uint8(v___x_1079_, sizeof(void*)*1, v___x_1078_);
v___x_1080_ = l_Repr_addAppParen(v___x_1079_, v_prec_1066_);
return v___x_1080_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprSlotMode_repr___boxed(lean_object* v_x_1089_, lean_object* v_prec_1090_){
_start:
{
uint8_t v_x_117__boxed_1091_; lean_object* v_res_1092_; 
v_x_117__boxed_1091_ = lean_unbox(v_x_1089_);
v_res_1092_ = lp_algalVerification_Algal_Replay_instReprSlotMode_repr(v_x_117__boxed_1091_, v_prec_1090_);
lean_dec(v_prec_1090_);
return v_res_1092_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqSlotMode_beq(uint8_t v_x_1095_, uint8_t v_y_1096_){
_start:
{
lean_object* v___x_1097_; lean_object* v___x_1098_; uint8_t v___x_1099_; 
v___x_1097_ = lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(v_x_1095_);
v___x_1098_ = lp_algalVerification_Algal_Replay_SlotMode_ctorIdx(v_y_1096_);
v___x_1099_ = lean_nat_dec_eq(v___x_1097_, v___x_1098_);
lean_dec(v___x_1098_);
lean_dec(v___x_1097_);
return v___x_1099_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqSlotMode_beq___boxed(lean_object* v_x_1100_, lean_object* v_y_1101_){
_start:
{
uint8_t v_x_17__boxed_1102_; uint8_t v_y_18__boxed_1103_; uint8_t v_res_1104_; lean_object* v_r_1105_; 
v_x_17__boxed_1102_ = lean_unbox(v_x_1100_);
v_y_18__boxed_1103_ = lean_unbox(v_y_1101_);
v_res_1104_ = lp_algalVerification_Algal_Replay_instBEqSlotMode_beq(v_x_17__boxed_1102_, v_y_18__boxed_1103_);
v_r_1105_ = lean_box(v_res_1104_);
return v_r_1105_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(uint8_t v_x_1108_){
_start:
{
switch(v_x_1108_)
{
case 0:
{
lean_object* v___x_1109_; 
v___x_1109_ = lean_unsigned_to_nat(0u);
return v___x_1109_;
}
case 1:
{
lean_object* v___x_1110_; 
v___x_1110_ = lean_unsigned_to_nat(1u);
return v___x_1110_;
}
case 2:
{
lean_object* v___x_1111_; 
v___x_1111_ = lean_unsigned_to_nat(2u);
return v___x_1111_;
}
default: 
{
lean_object* v___x_1112_; 
v___x_1112_ = lean_unsigned_to_nat(3u);
return v___x_1112_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorIdx___boxed(lean_object* v_x_1113_){
_start:
{
uint8_t v_x_boxed_1114_; lean_object* v_res_1115_; 
v_x_boxed_1114_ = lean_unbox(v_x_1113_);
v_res_1115_ = lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(v_x_boxed_1114_);
return v_res_1115_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___redArg(lean_object* v_k_1116_){
_start:
{
lean_inc(v_k_1116_);
return v_k_1116_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___redArg___boxed(lean_object* v_k_1117_){
_start:
{
lean_object* v_res_1118_; 
v_res_1118_ = lp_algalVerification_Algal_Replay_CellStatus_ctorElim___redArg(v_k_1117_);
lean_dec(v_k_1117_);
return v_res_1118_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim(lean_object* v_motive_1119_, lean_object* v_ctorIdx_1120_, uint8_t v_t_1121_, lean_object* v_h_1122_, lean_object* v_k_1123_){
_start:
{
lean_inc(v_k_1123_);
return v_k_1123_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ctorElim___boxed(lean_object* v_motive_1124_, lean_object* v_ctorIdx_1125_, lean_object* v_t_1126_, lean_object* v_h_1127_, lean_object* v_k_1128_){
_start:
{
uint8_t v_t_boxed_1129_; lean_object* v_res_1130_; 
v_t_boxed_1129_ = lean_unbox(v_t_1126_);
v_res_1130_ = lp_algalVerification_Algal_Replay_CellStatus_ctorElim(v_motive_1124_, v_ctorIdx_1125_, v_t_boxed_1129_, v_h_1127_, v_k_1128_);
lean_dec(v_k_1128_);
lean_dec(v_ctorIdx_1125_);
return v_res_1130_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___redArg(lean_object* v_committed_1131_){
_start:
{
lean_inc(v_committed_1131_);
return v_committed_1131_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___redArg___boxed(lean_object* v_committed_1132_){
_start:
{
lean_object* v_res_1133_; 
v_res_1133_ = lp_algalVerification_Algal_Replay_CellStatus_committed_elim___redArg(v_committed_1132_);
lean_dec(v_committed_1132_);
return v_res_1133_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim(lean_object* v_motive_1134_, uint8_t v_t_1135_, lean_object* v_h_1136_, lean_object* v_committed_1137_){
_start:
{
lean_inc(v_committed_1137_);
return v_committed_1137_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_committed_elim___boxed(lean_object* v_motive_1138_, lean_object* v_t_1139_, lean_object* v_h_1140_, lean_object* v_committed_1141_){
_start:
{
uint8_t v_t_boxed_1142_; lean_object* v_res_1143_; 
v_t_boxed_1142_ = lean_unbox(v_t_1139_);
v_res_1143_ = lp_algalVerification_Algal_Replay_CellStatus_committed_elim(v_motive_1138_, v_t_boxed_1142_, v_h_1140_, v_committed_1141_);
lean_dec(v_committed_1141_);
return v_res_1143_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___redArg(lean_object* v_skipped_1144_){
_start:
{
lean_inc(v_skipped_1144_);
return v_skipped_1144_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___redArg___boxed(lean_object* v_skipped_1145_){
_start:
{
lean_object* v_res_1146_; 
v_res_1146_ = lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___redArg(v_skipped_1145_);
lean_dec(v_skipped_1145_);
return v_res_1146_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim(lean_object* v_motive_1147_, uint8_t v_t_1148_, lean_object* v_h_1149_, lean_object* v_skipped_1150_){
_start:
{
lean_inc(v_skipped_1150_);
return v_skipped_1150_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_skipped_elim___boxed(lean_object* v_motive_1151_, lean_object* v_t_1152_, lean_object* v_h_1153_, lean_object* v_skipped_1154_){
_start:
{
uint8_t v_t_boxed_1155_; lean_object* v_res_1156_; 
v_t_boxed_1155_ = lean_unbox(v_t_1152_);
v_res_1156_ = lp_algalVerification_Algal_Replay_CellStatus_skipped_elim(v_motive_1151_, v_t_boxed_1155_, v_h_1153_, v_skipped_1154_);
lean_dec(v_skipped_1154_);
return v_res_1156_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___redArg(lean_object* v_failed_1157_){
_start:
{
lean_inc(v_failed_1157_);
return v_failed_1157_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___redArg___boxed(lean_object* v_failed_1158_){
_start:
{
lean_object* v_res_1159_; 
v_res_1159_ = lp_algalVerification_Algal_Replay_CellStatus_failed_elim___redArg(v_failed_1158_);
lean_dec(v_failed_1158_);
return v_res_1159_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim(lean_object* v_motive_1160_, uint8_t v_t_1161_, lean_object* v_h_1162_, lean_object* v_failed_1163_){
_start:
{
lean_inc(v_failed_1163_);
return v_failed_1163_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_failed_elim___boxed(lean_object* v_motive_1164_, lean_object* v_t_1165_, lean_object* v_h_1166_, lean_object* v_failed_1167_){
_start:
{
uint8_t v_t_boxed_1168_; lean_object* v_res_1169_; 
v_t_boxed_1168_ = lean_unbox(v_t_1165_);
v_res_1169_ = lp_algalVerification_Algal_Replay_CellStatus_failed_elim(v_motive_1164_, v_t_boxed_1168_, v_h_1166_, v_failed_1167_);
lean_dec(v_failed_1167_);
return v_res_1169_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___redArg(lean_object* v_suspended_1170_){
_start:
{
lean_inc(v_suspended_1170_);
return v_suspended_1170_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___redArg___boxed(lean_object* v_suspended_1171_){
_start:
{
lean_object* v_res_1172_; 
v_res_1172_ = lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___redArg(v_suspended_1171_);
lean_dec(v_suspended_1171_);
return v_res_1172_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim(lean_object* v_motive_1173_, uint8_t v_t_1174_, lean_object* v_h_1175_, lean_object* v_suspended_1176_){
_start:
{
lean_inc(v_suspended_1176_);
return v_suspended_1176_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_suspended_elim___boxed(lean_object* v_motive_1177_, lean_object* v_t_1178_, lean_object* v_h_1179_, lean_object* v_suspended_1180_){
_start:
{
uint8_t v_t_boxed_1181_; lean_object* v_res_1182_; 
v_t_boxed_1181_ = lean_unbox(v_t_1178_);
v_res_1182_ = lp_algalVerification_Algal_Replay_CellStatus_suspended_elim(v_motive_1177_, v_t_boxed_1181_, v_h_1179_, v_suspended_1180_);
lean_dec(v_suspended_1180_);
return v_res_1182_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_CellStatus_ofNat(lean_object* v_n_1183_){
_start:
{
lean_object* v___x_1184_; uint8_t v___x_1185_; 
v___x_1184_ = lean_unsigned_to_nat(1u);
v___x_1185_ = lean_nat_dec_le(v_n_1183_, v___x_1184_);
if (v___x_1185_ == 0)
{
lean_object* v___x_1186_; uint8_t v___x_1187_; 
v___x_1186_ = lean_unsigned_to_nat(2u);
v___x_1187_ = lean_nat_dec_le(v_n_1183_, v___x_1186_);
if (v___x_1187_ == 0)
{
uint8_t v___x_1188_; 
v___x_1188_ = 3;
return v___x_1188_;
}
else
{
uint8_t v___x_1189_; 
v___x_1189_ = 2;
return v___x_1189_;
}
}
else
{
lean_object* v___x_1190_; uint8_t v___x_1191_; 
v___x_1190_ = lean_unsigned_to_nat(0u);
v___x_1191_ = lean_nat_dec_le(v_n_1183_, v___x_1190_);
if (v___x_1191_ == 0)
{
uint8_t v___x_1192_; 
v___x_1192_ = 1;
return v___x_1192_;
}
else
{
uint8_t v___x_1193_; 
v___x_1193_ = 0;
return v___x_1193_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_CellStatus_ofNat___boxed(lean_object* v_n_1194_){
_start:
{
uint8_t v_res_1195_; lean_object* v_r_1196_; 
v_res_1195_ = lp_algalVerification_Algal_Replay_CellStatus_ofNat(v_n_1194_);
lean_dec(v_n_1194_);
v_r_1196_ = lean_box(v_res_1195_);
return v_r_1196_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellStatus(uint8_t v_x_1197_, uint8_t v_y_1198_){
_start:
{
lean_object* v___x_1199_; lean_object* v___x_1200_; uint8_t v___x_1201_; 
v___x_1199_ = lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(v_x_1197_);
v___x_1200_ = lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(v_y_1198_);
v___x_1201_ = lean_nat_dec_eq(v___x_1199_, v___x_1200_);
lean_dec(v___x_1200_);
lean_dec(v___x_1199_);
return v___x_1201_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellStatus___boxed(lean_object* v_x_1202_, lean_object* v_y_1203_){
_start:
{
uint8_t v_x_13__boxed_1204_; uint8_t v_y_14__boxed_1205_; uint8_t v_res_1206_; lean_object* v_r_1207_; 
v_x_13__boxed_1204_ = lean_unbox(v_x_1202_);
v_y_14__boxed_1205_ = lean_unbox(v_y_1203_);
v_res_1206_ = lp_algalVerification_Algal_Replay_instDecidableEqCellStatus(v_x_13__boxed_1204_, v_y_14__boxed_1205_);
v_r_1207_ = lean_box(v_res_1206_);
return v_r_1207_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr(uint8_t v_x_1220_, lean_object* v_prec_1221_){
_start:
{
lean_object* v___y_1223_; lean_object* v___y_1230_; lean_object* v___y_1237_; lean_object* v___y_1244_; 
switch(v_x_1220_)
{
case 0:
{
lean_object* v___x_1250_; uint8_t v___x_1251_; 
v___x_1250_ = lean_unsigned_to_nat(1024u);
v___x_1251_ = lean_nat_dec_le(v___x_1250_, v_prec_1221_);
if (v___x_1251_ == 0)
{
lean_object* v___x_1252_; 
v___x_1252_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1223_ = v___x_1252_;
goto v___jp_1222_;
}
else
{
lean_object* v___x_1253_; 
v___x_1253_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1223_ = v___x_1253_;
goto v___jp_1222_;
}
}
case 1:
{
lean_object* v___x_1254_; uint8_t v___x_1255_; 
v___x_1254_ = lean_unsigned_to_nat(1024u);
v___x_1255_ = lean_nat_dec_le(v___x_1254_, v_prec_1221_);
if (v___x_1255_ == 0)
{
lean_object* v___x_1256_; 
v___x_1256_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1230_ = v___x_1256_;
goto v___jp_1229_;
}
else
{
lean_object* v___x_1257_; 
v___x_1257_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1230_ = v___x_1257_;
goto v___jp_1229_;
}
}
case 2:
{
lean_object* v___x_1258_; uint8_t v___x_1259_; 
v___x_1258_ = lean_unsigned_to_nat(1024u);
v___x_1259_ = lean_nat_dec_le(v___x_1258_, v_prec_1221_);
if (v___x_1259_ == 0)
{
lean_object* v___x_1260_; 
v___x_1260_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1237_ = v___x_1260_;
goto v___jp_1236_;
}
else
{
lean_object* v___x_1261_; 
v___x_1261_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1237_ = v___x_1261_;
goto v___jp_1236_;
}
}
default: 
{
lean_object* v___x_1262_; uint8_t v___x_1263_; 
v___x_1262_ = lean_unsigned_to_nat(1024u);
v___x_1263_ = lean_nat_dec_le(v___x_1262_, v_prec_1221_);
if (v___x_1263_ == 0)
{
lean_object* v___x_1264_; 
v___x_1264_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1244_ = v___x_1264_;
goto v___jp_1243_;
}
else
{
lean_object* v___x_1265_; 
v___x_1265_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1244_ = v___x_1265_;
goto v___jp_1243_;
}
}
}
v___jp_1222_:
{
lean_object* v___x_1224_; lean_object* v___x_1225_; uint8_t v___x_1226_; lean_object* v___x_1227_; lean_object* v___x_1228_; 
v___x_1224_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__1));
lean_inc(v___y_1223_);
v___x_1225_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1225_, 0, v___y_1223_);
lean_ctor_set(v___x_1225_, 1, v___x_1224_);
v___x_1226_ = 0;
v___x_1227_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1227_, 0, v___x_1225_);
lean_ctor_set_uint8(v___x_1227_, sizeof(void*)*1, v___x_1226_);
v___x_1228_ = l_Repr_addAppParen(v___x_1227_, v_prec_1221_);
return v___x_1228_;
}
v___jp_1229_:
{
lean_object* v___x_1231_; lean_object* v___x_1232_; uint8_t v___x_1233_; lean_object* v___x_1234_; lean_object* v___x_1235_; 
v___x_1231_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__3));
lean_inc(v___y_1230_);
v___x_1232_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1232_, 0, v___y_1230_);
lean_ctor_set(v___x_1232_, 1, v___x_1231_);
v___x_1233_ = 0;
v___x_1234_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1234_, 0, v___x_1232_);
lean_ctor_set_uint8(v___x_1234_, sizeof(void*)*1, v___x_1233_);
v___x_1235_ = l_Repr_addAppParen(v___x_1234_, v_prec_1221_);
return v___x_1235_;
}
v___jp_1236_:
{
lean_object* v___x_1238_; lean_object* v___x_1239_; uint8_t v___x_1240_; lean_object* v___x_1241_; lean_object* v___x_1242_; 
v___x_1238_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__5));
lean_inc(v___y_1237_);
v___x_1239_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1239_, 0, v___y_1237_);
lean_ctor_set(v___x_1239_, 1, v___x_1238_);
v___x_1240_ = 0;
v___x_1241_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1241_, 0, v___x_1239_);
lean_ctor_set_uint8(v___x_1241_, sizeof(void*)*1, v___x_1240_);
v___x_1242_ = l_Repr_addAppParen(v___x_1241_, v_prec_1221_);
return v___x_1242_;
}
v___jp_1243_:
{
lean_object* v___x_1245_; lean_object* v___x_1246_; uint8_t v___x_1247_; lean_object* v___x_1248_; lean_object* v___x_1249_; 
v___x_1245_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprCellStatus_repr___closed__7));
lean_inc(v___y_1244_);
v___x_1246_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1246_, 0, v___y_1244_);
lean_ctor_set(v___x_1246_, 1, v___x_1245_);
v___x_1247_ = 0;
v___x_1248_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1248_, 0, v___x_1246_);
lean_ctor_set_uint8(v___x_1248_, sizeof(void*)*1, v___x_1247_);
v___x_1249_ = l_Repr_addAppParen(v___x_1248_, v_prec_1221_);
return v___x_1249_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprCellStatus_repr___boxed(lean_object* v_x_1266_, lean_object* v_prec_1267_){
_start:
{
uint8_t v_x_229__boxed_1268_; lean_object* v_res_1269_; 
v_x_229__boxed_1268_ = lean_unbox(v_x_1266_);
v_res_1269_ = lp_algalVerification_Algal_Replay_instReprCellStatus_repr(v_x_229__boxed_1268_, v_prec_1267_);
lean_dec(v_prec_1267_);
return v_res_1269_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqCellStatus_beq(uint8_t v_x_1272_, uint8_t v_y_1273_){
_start:
{
lean_object* v___x_1274_; lean_object* v___x_1275_; uint8_t v___x_1276_; 
v___x_1274_ = lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(v_x_1272_);
v___x_1275_ = lp_algalVerification_Algal_Replay_CellStatus_ctorIdx(v_y_1273_);
v___x_1276_ = lean_nat_dec_eq(v___x_1274_, v___x_1275_);
lean_dec(v___x_1275_);
lean_dec(v___x_1274_);
return v___x_1276_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqCellStatus_beq___boxed(lean_object* v_x_1277_, lean_object* v_y_1278_){
_start:
{
uint8_t v_x_17__boxed_1279_; uint8_t v_y_18__boxed_1280_; uint8_t v_res_1281_; lean_object* v_r_1282_; 
v_x_17__boxed_1279_ = lean_unbox(v_x_1277_);
v_y_18__boxed_1280_ = lean_unbox(v_y_1278_);
v_res_1281_ = lp_algalVerification_Algal_Replay_instBEqCellStatus_beq(v_x_17__boxed_1279_, v_y_18__boxed_1280_);
v_r_1282_ = lean_box(v_res_1281_);
return v_r_1282_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0(lean_object* v_a_1285_, lean_object* v_b_1286_){
_start:
{
lean_object* v___x_1287_; lean_object* v___x_1288_; uint8_t v___x_1289_; 
v___x_1287_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_1288_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed), 2, 0);
v___x_1289_ = l_instDecidableEqProd___redArg(v___x_1287_, v___x_1288_, v_a_1285_, v_b_1286_);
return v___x_1289_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0___boxed(lean_object* v_a_1290_, lean_object* v_b_1291_){
_start:
{
uint8_t v_res_1292_; lean_object* v_r_1293_; 
v_res_1292_ = lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__0(v_a_1290_, v_b_1291_);
v_r_1293_ = lean_box(v_res_1292_);
return v_r_1293_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1(lean_object* v_a_1294_, lean_object* v_b_1295_){
_start:
{
lean_object* v___x_1296_; lean_object* v___x_1297_; uint8_t v___x_1298_; 
v___x_1296_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_1297_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqSlotMode___boxed), 2, 0);
v___x_1298_ = l_instDecidableEqProd___redArg(v___x_1296_, v___x_1297_, v_a_1294_, v_b_1295_);
return v___x_1298_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1___boxed(lean_object* v_a_1299_, lean_object* v_b_1300_){
_start:
{
uint8_t v_res_1301_; lean_object* v_r_1302_; 
v_res_1301_ = lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___lam__1(v_a_1299_, v_b_1300_);
v_r_1302_ = lean_box(v_res_1301_);
return v_r_1302_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq(lean_object* v_x_1305_, lean_object* v_x_1306_){
_start:
{
lean_object* v_path_1307_; uint8_t v_status_1308_; lean_object* v_outputs_1309_; lean_object* v_failure_1310_; lean_object* v_work_1311_; lean_object* v_slot_1312_; lean_object* v_path_1313_; uint8_t v_status_1314_; lean_object* v_outputs_1315_; lean_object* v_failure_1316_; lean_object* v_work_1317_; lean_object* v_slot_1318_; uint8_t v___x_1319_; 
v_path_1307_ = lean_ctor_get(v_x_1305_, 0);
lean_inc_ref(v_path_1307_);
v_status_1308_ = lean_ctor_get_uint8(v_x_1305_, sizeof(void*)*5);
v_outputs_1309_ = lean_ctor_get(v_x_1305_, 1);
lean_inc(v_outputs_1309_);
v_failure_1310_ = lean_ctor_get(v_x_1305_, 2);
lean_inc(v_failure_1310_);
v_work_1311_ = lean_ctor_get(v_x_1305_, 3);
lean_inc(v_work_1311_);
v_slot_1312_ = lean_ctor_get(v_x_1305_, 4);
lean_inc(v_slot_1312_);
lean_dec_ref(v_x_1305_);
v_path_1313_ = lean_ctor_get(v_x_1306_, 0);
lean_inc_ref(v_path_1313_);
v_status_1314_ = lean_ctor_get_uint8(v_x_1306_, sizeof(void*)*5);
v_outputs_1315_ = lean_ctor_get(v_x_1306_, 1);
lean_inc(v_outputs_1315_);
v_failure_1316_ = lean_ctor_get(v_x_1306_, 2);
lean_inc(v_failure_1316_);
v_work_1317_ = lean_ctor_get(v_x_1306_, 3);
lean_inc(v_work_1317_);
v_slot_1318_ = lean_ctor_get(v_x_1306_, 4);
lean_inc(v_slot_1318_);
lean_dec_ref(v_x_1306_);
v___x_1319_ = lean_string_dec_eq(v_path_1307_, v_path_1313_);
lean_dec_ref(v_path_1313_);
lean_dec_ref(v_path_1307_);
if (v___x_1319_ == 0)
{
lean_dec(v_slot_1318_);
lean_dec(v_work_1317_);
lean_dec(v_failure_1316_);
lean_dec(v_outputs_1315_);
lean_dec(v_slot_1312_);
lean_dec(v_work_1311_);
lean_dec(v_failure_1310_);
lean_dec(v_outputs_1309_);
return v___x_1319_;
}
else
{
uint8_t v___x_1320_; 
v___x_1320_ = lp_algalVerification_Algal_Replay_instDecidableEqCellStatus(v_status_1308_, v_status_1314_);
if (v___x_1320_ == 0)
{
lean_dec(v_slot_1318_);
lean_dec(v_work_1317_);
lean_dec(v_failure_1316_);
lean_dec(v_outputs_1315_);
lean_dec(v_slot_1312_);
lean_dec(v_work_1311_);
lean_dec(v_failure_1310_);
lean_dec(v_outputs_1309_);
return v___x_1320_;
}
else
{
lean_object* v___f_1321_; uint8_t v___x_1322_; 
v___f_1321_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0));
v___x_1322_ = l_instDecidableEqList___redArg(v___f_1321_, v_outputs_1309_, v_outputs_1315_);
if (v___x_1322_ == 0)
{
lean_dec(v_slot_1318_);
lean_dec(v_work_1317_);
lean_dec(v_failure_1316_);
lean_dec(v_slot_1312_);
lean_dec(v_work_1311_);
lean_dec(v_failure_1310_);
return v___x_1322_;
}
else
{
lean_object* v___x_1323_; uint8_t v___x_1324_; 
v___x_1323_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed), 2, 0);
v___x_1324_ = l_Option_instDecidableEq___redArg(v___x_1323_, v_failure_1310_, v_failure_1316_);
if (v___x_1324_ == 0)
{
lean_dec(v_slot_1318_);
lean_dec(v_work_1317_);
lean_dec(v_slot_1312_);
lean_dec(v_work_1311_);
return v___x_1324_;
}
else
{
uint8_t v___x_1325_; 
v___x_1325_ = lean_nat_dec_eq(v_work_1311_, v_work_1317_);
lean_dec(v_work_1317_);
lean_dec(v_work_1311_);
if (v___x_1325_ == 0)
{
lean_dec(v_slot_1318_);
lean_dec(v_slot_1312_);
return v___x_1325_;
}
else
{
lean_object* v___f_1326_; uint8_t v___x_1327_; 
v___f_1326_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__1));
v___x_1327_ = l_Option_instDecidableEq___redArg(v___f_1326_, v_slot_1312_, v_slot_1318_);
return v___x_1327_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___boxed(lean_object* v_x_1328_, lean_object* v_x_1329_){
_start:
{
uint8_t v_res_1330_; lean_object* v_r_1331_; 
v_res_1330_ = lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq(v_x_1328_, v_x_1329_);
v_r_1331_ = lean_box(v_res_1330_);
return v_r_1331_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqCellRecord(lean_object* v_x_1332_, lean_object* v_x_1333_){
_start:
{
uint8_t v___x_1334_; 
v___x_1334_ = lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq(v_x_1332_, v_x_1333_);
return v___x_1334_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqCellRecord___boxed(lean_object* v_x_1335_, lean_object* v_x_1336_){
_start:
{
uint8_t v_res_1337_; lean_object* v_r_1338_; 
v_res_1337_ = lp_algalVerification_Algal_Replay_instDecidableEqCellRecord(v_x_1335_, v_x_1336_);
v_r_1338_ = lean_box(v_res_1337_);
return v_r_1338_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorIdx(uint8_t v_x_1339_){
_start:
{
switch(v_x_1339_)
{
case 0:
{
lean_object* v___x_1340_; 
v___x_1340_ = lean_unsigned_to_nat(0u);
return v___x_1340_;
}
case 1:
{
lean_object* v___x_1341_; 
v___x_1341_ = lean_unsigned_to_nat(1u);
return v___x_1341_;
}
case 2:
{
lean_object* v___x_1342_; 
v___x_1342_ = lean_unsigned_to_nat(2u);
return v___x_1342_;
}
default: 
{
lean_object* v___x_1343_; 
v___x_1343_ = lean_unsigned_to_nat(3u);
return v___x_1343_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorIdx___boxed(lean_object* v_x_1344_){
_start:
{
uint8_t v_x_boxed_1345_; lean_object* v_res_1346_; 
v_x_boxed_1345_ = lean_unbox(v_x_1344_);
v_res_1346_ = lp_algalVerification_Algal_Replay_Outcome_ctorIdx(v_x_boxed_1345_);
return v_res_1346_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___redArg(lean_object* v_k_1347_){
_start:
{
lean_inc(v_k_1347_);
return v_k_1347_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___redArg___boxed(lean_object* v_k_1348_){
_start:
{
lean_object* v_res_1349_; 
v_res_1349_ = lp_algalVerification_Algal_Replay_Outcome_ctorElim___redArg(v_k_1348_);
lean_dec(v_k_1348_);
return v_res_1349_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim(lean_object* v_motive_1350_, lean_object* v_ctorIdx_1351_, uint8_t v_t_1352_, lean_object* v_h_1353_, lean_object* v_k_1354_){
_start:
{
lean_inc(v_k_1354_);
return v_k_1354_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ctorElim___boxed(lean_object* v_motive_1355_, lean_object* v_ctorIdx_1356_, lean_object* v_t_1357_, lean_object* v_h_1358_, lean_object* v_k_1359_){
_start:
{
uint8_t v_t_boxed_1360_; lean_object* v_res_1361_; 
v_t_boxed_1360_ = lean_unbox(v_t_1357_);
v_res_1361_ = lp_algalVerification_Algal_Replay_Outcome_ctorElim(v_motive_1355_, v_ctorIdx_1356_, v_t_boxed_1360_, v_h_1358_, v_k_1359_);
lean_dec(v_k_1359_);
lean_dec(v_ctorIdx_1356_);
return v_res_1361_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___redArg(lean_object* v_complete_1362_){
_start:
{
lean_inc(v_complete_1362_);
return v_complete_1362_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___redArg___boxed(lean_object* v_complete_1363_){
_start:
{
lean_object* v_res_1364_; 
v_res_1364_ = lp_algalVerification_Algal_Replay_Outcome_complete_elim___redArg(v_complete_1363_);
lean_dec(v_complete_1363_);
return v_res_1364_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim(lean_object* v_motive_1365_, uint8_t v_t_1366_, lean_object* v_h_1367_, lean_object* v_complete_1368_){
_start:
{
lean_inc(v_complete_1368_);
return v_complete_1368_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_complete_elim___boxed(lean_object* v_motive_1369_, lean_object* v_t_1370_, lean_object* v_h_1371_, lean_object* v_complete_1372_){
_start:
{
uint8_t v_t_boxed_1373_; lean_object* v_res_1374_; 
v_t_boxed_1373_ = lean_unbox(v_t_1370_);
v_res_1374_ = lp_algalVerification_Algal_Replay_Outcome_complete_elim(v_motive_1369_, v_t_boxed_1373_, v_h_1371_, v_complete_1372_);
lean_dec(v_complete_1372_);
return v_res_1374_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___redArg(lean_object* v_failed_1375_){
_start:
{
lean_inc(v_failed_1375_);
return v_failed_1375_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___redArg___boxed(lean_object* v_failed_1376_){
_start:
{
lean_object* v_res_1377_; 
v_res_1377_ = lp_algalVerification_Algal_Replay_Outcome_failed_elim___redArg(v_failed_1376_);
lean_dec(v_failed_1376_);
return v_res_1377_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim(lean_object* v_motive_1378_, uint8_t v_t_1379_, lean_object* v_h_1380_, lean_object* v_failed_1381_){
_start:
{
lean_inc(v_failed_1381_);
return v_failed_1381_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_failed_elim___boxed(lean_object* v_motive_1382_, lean_object* v_t_1383_, lean_object* v_h_1384_, lean_object* v_failed_1385_){
_start:
{
uint8_t v_t_boxed_1386_; lean_object* v_res_1387_; 
v_t_boxed_1386_ = lean_unbox(v_t_1383_);
v_res_1387_ = lp_algalVerification_Algal_Replay_Outcome_failed_elim(v_motive_1382_, v_t_boxed_1386_, v_h_1384_, v_failed_1385_);
lean_dec(v_failed_1385_);
return v_res_1387_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___redArg(lean_object* v_stuck_1388_){
_start:
{
lean_inc(v_stuck_1388_);
return v_stuck_1388_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___redArg___boxed(lean_object* v_stuck_1389_){
_start:
{
lean_object* v_res_1390_; 
v_res_1390_ = lp_algalVerification_Algal_Replay_Outcome_stuck_elim___redArg(v_stuck_1389_);
lean_dec(v_stuck_1389_);
return v_res_1390_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim(lean_object* v_motive_1391_, uint8_t v_t_1392_, lean_object* v_h_1393_, lean_object* v_stuck_1394_){
_start:
{
lean_inc(v_stuck_1394_);
return v_stuck_1394_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_stuck_elim___boxed(lean_object* v_motive_1395_, lean_object* v_t_1396_, lean_object* v_h_1397_, lean_object* v_stuck_1398_){
_start:
{
uint8_t v_t_boxed_1399_; lean_object* v_res_1400_; 
v_t_boxed_1399_ = lean_unbox(v_t_1396_);
v_res_1400_ = lp_algalVerification_Algal_Replay_Outcome_stuck_elim(v_motive_1395_, v_t_boxed_1399_, v_h_1397_, v_stuck_1398_);
lean_dec(v_stuck_1398_);
return v_res_1400_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___redArg(lean_object* v_suspended_1401_){
_start:
{
lean_inc(v_suspended_1401_);
return v_suspended_1401_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___redArg___boxed(lean_object* v_suspended_1402_){
_start:
{
lean_object* v_res_1403_; 
v_res_1403_ = lp_algalVerification_Algal_Replay_Outcome_suspended_elim___redArg(v_suspended_1402_);
lean_dec(v_suspended_1402_);
return v_res_1403_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim(lean_object* v_motive_1404_, uint8_t v_t_1405_, lean_object* v_h_1406_, lean_object* v_suspended_1407_){
_start:
{
lean_inc(v_suspended_1407_);
return v_suspended_1407_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_suspended_elim___boxed(lean_object* v_motive_1408_, lean_object* v_t_1409_, lean_object* v_h_1410_, lean_object* v_suspended_1411_){
_start:
{
uint8_t v_t_boxed_1412_; lean_object* v_res_1413_; 
v_t_boxed_1412_ = lean_unbox(v_t_1409_);
v_res_1413_ = lp_algalVerification_Algal_Replay_Outcome_suspended_elim(v_motive_1408_, v_t_boxed_1412_, v_h_1410_, v_suspended_1411_);
lean_dec(v_suspended_1411_);
return v_res_1413_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Outcome_ofNat(lean_object* v_n_1414_){
_start:
{
lean_object* v___x_1415_; uint8_t v___x_1416_; 
v___x_1415_ = lean_unsigned_to_nat(1u);
v___x_1416_ = lean_nat_dec_le(v_n_1414_, v___x_1415_);
if (v___x_1416_ == 0)
{
lean_object* v___x_1417_; uint8_t v___x_1418_; 
v___x_1417_ = lean_unsigned_to_nat(2u);
v___x_1418_ = lean_nat_dec_le(v_n_1414_, v___x_1417_);
if (v___x_1418_ == 0)
{
uint8_t v___x_1419_; 
v___x_1419_ = 3;
return v___x_1419_;
}
else
{
uint8_t v___x_1420_; 
v___x_1420_ = 2;
return v___x_1420_;
}
}
else
{
lean_object* v___x_1421_; uint8_t v___x_1422_; 
v___x_1421_ = lean_unsigned_to_nat(0u);
v___x_1422_ = lean_nat_dec_le(v_n_1414_, v___x_1421_);
if (v___x_1422_ == 0)
{
uint8_t v___x_1423_; 
v___x_1423_ = 1;
return v___x_1423_;
}
else
{
uint8_t v___x_1424_; 
v___x_1424_ = 0;
return v___x_1424_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Outcome_ofNat___boxed(lean_object* v_n_1425_){
_start:
{
uint8_t v_res_1426_; lean_object* v_r_1427_; 
v_res_1426_ = lp_algalVerification_Algal_Replay_Outcome_ofNat(v_n_1425_);
lean_dec(v_n_1425_);
v_r_1427_ = lean_box(v_res_1426_);
return v_r_1427_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqOutcome(uint8_t v_x_1428_, uint8_t v_y_1429_){
_start:
{
lean_object* v___x_1430_; lean_object* v___x_1431_; uint8_t v___x_1432_; 
v___x_1430_ = lp_algalVerification_Algal_Replay_Outcome_ctorIdx(v_x_1428_);
v___x_1431_ = lp_algalVerification_Algal_Replay_Outcome_ctorIdx(v_y_1429_);
v___x_1432_ = lean_nat_dec_eq(v___x_1430_, v___x_1431_);
lean_dec(v___x_1431_);
lean_dec(v___x_1430_);
return v___x_1432_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqOutcome___boxed(lean_object* v_x_1433_, lean_object* v_y_1434_){
_start:
{
uint8_t v_x_13__boxed_1435_; uint8_t v_y_14__boxed_1436_; uint8_t v_res_1437_; lean_object* v_r_1438_; 
v_x_13__boxed_1435_ = lean_unbox(v_x_1433_);
v_y_14__boxed_1436_ = lean_unbox(v_y_1434_);
v_res_1437_ = lp_algalVerification_Algal_Replay_instDecidableEqOutcome(v_x_13__boxed_1435_, v_y_14__boxed_1436_);
v_r_1438_ = lean_box(v_res_1437_);
return v_r_1438_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr(uint8_t v_x_1451_, lean_object* v_prec_1452_){
_start:
{
lean_object* v___y_1454_; lean_object* v___y_1461_; lean_object* v___y_1468_; lean_object* v___y_1475_; 
switch(v_x_1451_)
{
case 0:
{
lean_object* v___x_1481_; uint8_t v___x_1482_; 
v___x_1481_ = lean_unsigned_to_nat(1024u);
v___x_1482_ = lean_nat_dec_le(v___x_1481_, v_prec_1452_);
if (v___x_1482_ == 0)
{
lean_object* v___x_1483_; 
v___x_1483_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1454_ = v___x_1483_;
goto v___jp_1453_;
}
else
{
lean_object* v___x_1484_; 
v___x_1484_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1454_ = v___x_1484_;
goto v___jp_1453_;
}
}
case 1:
{
lean_object* v___x_1485_; uint8_t v___x_1486_; 
v___x_1485_ = lean_unsigned_to_nat(1024u);
v___x_1486_ = lean_nat_dec_le(v___x_1485_, v_prec_1452_);
if (v___x_1486_ == 0)
{
lean_object* v___x_1487_; 
v___x_1487_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1461_ = v___x_1487_;
goto v___jp_1460_;
}
else
{
lean_object* v___x_1488_; 
v___x_1488_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1461_ = v___x_1488_;
goto v___jp_1460_;
}
}
case 2:
{
lean_object* v___x_1489_; uint8_t v___x_1490_; 
v___x_1489_ = lean_unsigned_to_nat(1024u);
v___x_1490_ = lean_nat_dec_le(v___x_1489_, v_prec_1452_);
if (v___x_1490_ == 0)
{
lean_object* v___x_1491_; 
v___x_1491_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1468_ = v___x_1491_;
goto v___jp_1467_;
}
else
{
lean_object* v___x_1492_; 
v___x_1492_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1468_ = v___x_1492_;
goto v___jp_1467_;
}
}
default: 
{
lean_object* v___x_1493_; uint8_t v___x_1494_; 
v___x_1493_ = lean_unsigned_to_nat(1024u);
v___x_1494_ = lean_nat_dec_le(v___x_1493_, v_prec_1452_);
if (v___x_1494_ == 0)
{
lean_object* v___x_1495_; 
v___x_1495_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1475_ = v___x_1495_;
goto v___jp_1474_;
}
else
{
lean_object* v___x_1496_; 
v___x_1496_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1475_ = v___x_1496_;
goto v___jp_1474_;
}
}
}
v___jp_1453_:
{
lean_object* v___x_1455_; lean_object* v___x_1456_; uint8_t v___x_1457_; lean_object* v___x_1458_; lean_object* v___x_1459_; 
v___x_1455_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__1));
lean_inc(v___y_1454_);
v___x_1456_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1456_, 0, v___y_1454_);
lean_ctor_set(v___x_1456_, 1, v___x_1455_);
v___x_1457_ = 0;
v___x_1458_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1458_, 0, v___x_1456_);
lean_ctor_set_uint8(v___x_1458_, sizeof(void*)*1, v___x_1457_);
v___x_1459_ = l_Repr_addAppParen(v___x_1458_, v_prec_1452_);
return v___x_1459_;
}
v___jp_1460_:
{
lean_object* v___x_1462_; lean_object* v___x_1463_; uint8_t v___x_1464_; lean_object* v___x_1465_; lean_object* v___x_1466_; 
v___x_1462_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__3));
lean_inc(v___y_1461_);
v___x_1463_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1463_, 0, v___y_1461_);
lean_ctor_set(v___x_1463_, 1, v___x_1462_);
v___x_1464_ = 0;
v___x_1465_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1465_, 0, v___x_1463_);
lean_ctor_set_uint8(v___x_1465_, sizeof(void*)*1, v___x_1464_);
v___x_1466_ = l_Repr_addAppParen(v___x_1465_, v_prec_1452_);
return v___x_1466_;
}
v___jp_1467_:
{
lean_object* v___x_1469_; lean_object* v___x_1470_; uint8_t v___x_1471_; lean_object* v___x_1472_; lean_object* v___x_1473_; 
v___x_1469_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__5));
lean_inc(v___y_1468_);
v___x_1470_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1470_, 0, v___y_1468_);
lean_ctor_set(v___x_1470_, 1, v___x_1469_);
v___x_1471_ = 0;
v___x_1472_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1472_, 0, v___x_1470_);
lean_ctor_set_uint8(v___x_1472_, sizeof(void*)*1, v___x_1471_);
v___x_1473_ = l_Repr_addAppParen(v___x_1472_, v_prec_1452_);
return v___x_1473_;
}
v___jp_1474_:
{
lean_object* v___x_1476_; lean_object* v___x_1477_; uint8_t v___x_1478_; lean_object* v___x_1479_; lean_object* v___x_1480_; 
v___x_1476_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprOutcome_repr___closed__7));
lean_inc(v___y_1475_);
v___x_1477_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1477_, 0, v___y_1475_);
lean_ctor_set(v___x_1477_, 1, v___x_1476_);
v___x_1478_ = 0;
v___x_1479_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1479_, 0, v___x_1477_);
lean_ctor_set_uint8(v___x_1479_, sizeof(void*)*1, v___x_1478_);
v___x_1480_ = l_Repr_addAppParen(v___x_1479_, v_prec_1452_);
return v___x_1480_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprOutcome_repr___boxed(lean_object* v_x_1497_, lean_object* v_prec_1498_){
_start:
{
uint8_t v_x_229__boxed_1499_; lean_object* v_res_1500_; 
v_x_229__boxed_1499_ = lean_unbox(v_x_1497_);
v_res_1500_ = lp_algalVerification_Algal_Replay_instReprOutcome_repr(v_x_229__boxed_1499_, v_prec_1498_);
lean_dec(v_prec_1498_);
return v_res_1500_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqOutcome_beq(uint8_t v_x_1503_, uint8_t v_y_1504_){
_start:
{
lean_object* v___x_1505_; lean_object* v___x_1506_; uint8_t v___x_1507_; 
v___x_1505_ = lp_algalVerification_Algal_Replay_Outcome_ctorIdx(v_x_1503_);
v___x_1506_ = lp_algalVerification_Algal_Replay_Outcome_ctorIdx(v_y_1504_);
v___x_1507_ = lean_nat_dec_eq(v___x_1505_, v___x_1506_);
lean_dec(v___x_1506_);
lean_dec(v___x_1505_);
return v___x_1507_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqOutcome_beq___boxed(lean_object* v_x_1508_, lean_object* v_y_1509_){
_start:
{
uint8_t v_x_17__boxed_1510_; uint8_t v_y_18__boxed_1511_; uint8_t v_res_1512_; lean_object* v_r_1513_; 
v_x_17__boxed_1510_ = lean_unbox(v_x_1508_);
v_y_18__boxed_1511_ = lean_unbox(v_y_1509_);
v_res_1512_ = lp_algalVerification_Algal_Replay_instBEqOutcome_beq(v_x_17__boxed_1510_, v_y_18__boxed_1511_);
v_r_1513_ = lean_box(v_res_1512_);
return v_r_1513_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorIdx(lean_object* v_x_1516_){
_start:
{
switch(lean_obj_tag(v_x_1516_))
{
case 0:
{
lean_object* v___x_1517_; 
v___x_1517_ = lean_unsigned_to_nat(0u);
return v___x_1517_;
}
case 1:
{
lean_object* v___x_1518_; 
v___x_1518_ = lean_unsigned_to_nat(1u);
return v___x_1518_;
}
case 2:
{
lean_object* v___x_1519_; 
v___x_1519_ = lean_unsigned_to_nat(2u);
return v___x_1519_;
}
default: 
{
lean_object* v___x_1520_; 
v___x_1520_ = lean_unsigned_to_nat(3u);
return v___x_1520_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorIdx___boxed(lean_object* v_x_1521_){
_start:
{
lean_object* v_res_1522_; 
v_res_1522_ = lp_algalVerification_Algal_Replay_Directive_ctorIdx(v_x_1521_);
lean_dec_ref(v_x_1521_);
return v_res_1522_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(lean_object* v_t_1523_, lean_object* v_k_1524_){
_start:
{
switch(lean_obj_tag(v_t_1523_))
{
case 0:
{
lean_object* v_a_1525_; lean_object* v___x_1526_; 
v_a_1525_ = lean_ctor_get(v_t_1523_, 0);
lean_inc_ref(v_a_1525_);
lean_dec_ref_known(v_t_1523_, 1);
v___x_1526_ = lean_apply_1(v_k_1524_, v_a_1525_);
return v___x_1526_;
}
case 1:
{
lean_object* v_path_1527_; lean_object* v_name_1528_; lean_object* v___x_1529_; 
v_path_1527_ = lean_ctor_get(v_t_1523_, 0);
lean_inc_ref(v_path_1527_);
v_name_1528_ = lean_ctor_get(v_t_1523_, 1);
lean_inc_ref(v_name_1528_);
lean_dec_ref_known(v_t_1523_, 2);
v___x_1529_ = lean_apply_2(v_k_1524_, v_path_1527_, v_name_1528_);
return v___x_1529_;
}
case 2:
{
lean_object* v_path_1530_; lean_object* v_name_1531_; lean_object* v_data_1532_; lean_object* v___x_1533_; 
v_path_1530_ = lean_ctor_get(v_t_1523_, 0);
lean_inc_ref(v_path_1530_);
v_name_1531_ = lean_ctor_get(v_t_1523_, 1);
lean_inc_ref(v_name_1531_);
v_data_1532_ = lean_ctor_get(v_t_1523_, 2);
lean_inc(v_data_1532_);
lean_dec_ref_known(v_t_1523_, 3);
v___x_1533_ = lean_apply_3(v_k_1524_, v_path_1530_, v_name_1531_, v_data_1532_);
return v___x_1533_;
}
default: 
{
uint8_t v_outcome_1534_; lean_object* v_failure_1535_; lean_object* v___x_1536_; lean_object* v___x_1537_; 
v_outcome_1534_ = lean_ctor_get_uint8(v_t_1523_, sizeof(void*)*1);
v_failure_1535_ = lean_ctor_get(v_t_1523_, 0);
lean_inc(v_failure_1535_);
lean_dec_ref_known(v_t_1523_, 1);
v___x_1536_ = lean_box(v_outcome_1534_);
v___x_1537_ = lean_apply_2(v_k_1524_, v___x_1536_, v_failure_1535_);
return v___x_1537_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim(lean_object* v_motive_1538_, lean_object* v_ctorIdx_1539_, lean_object* v_t_1540_, lean_object* v_h_1541_, lean_object* v_k_1542_){
_start:
{
lean_object* v___x_1543_; 
v___x_1543_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1540_, v_k_1542_);
return v___x_1543_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_ctorElim___boxed(lean_object* v_motive_1544_, lean_object* v_ctorIdx_1545_, lean_object* v_t_1546_, lean_object* v_h_1547_, lean_object* v_k_1548_){
_start:
{
lean_object* v_res_1549_; 
v_res_1549_ = lp_algalVerification_Algal_Replay_Directive_ctorElim(v_motive_1544_, v_ctorIdx_1545_, v_t_1546_, v_h_1547_, v_k_1548_);
lean_dec(v_ctorIdx_1545_);
return v_res_1549_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_request_elim___redArg(lean_object* v_t_1550_, lean_object* v_request_1551_){
_start:
{
lean_object* v___x_1552_; 
v___x_1552_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1550_, v_request_1551_);
return v___x_1552_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_request_elim(lean_object* v_motive_1553_, lean_object* v_t_1554_, lean_object* v_h_1555_, lean_object* v_request_1556_){
_start:
{
lean_object* v___x_1557_; 
v___x_1557_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1554_, v_request_1556_);
return v___x_1557_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_readSlot_elim___redArg(lean_object* v_t_1558_, lean_object* v_readSlot_1559_){
_start:
{
lean_object* v___x_1560_; 
v___x_1560_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1558_, v_readSlot_1559_);
return v___x_1560_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_readSlot_elim(lean_object* v_motive_1561_, lean_object* v_t_1562_, lean_object* v_h_1563_, lean_object* v_readSlot_1564_){
_start:
{
lean_object* v___x_1565_; 
v___x_1565_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1562_, v_readSlot_1564_);
return v___x_1565_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_writeSlot_elim___redArg(lean_object* v_t_1566_, lean_object* v_writeSlot_1567_){
_start:
{
lean_object* v___x_1568_; 
v___x_1568_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1566_, v_writeSlot_1567_);
return v___x_1568_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_writeSlot_elim(lean_object* v_motive_1569_, lean_object* v_t_1570_, lean_object* v_h_1571_, lean_object* v_writeSlot_1572_){
_start:
{
lean_object* v___x_1573_; 
v___x_1573_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1570_, v_writeSlot_1572_);
return v___x_1573_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_done_elim___redArg(lean_object* v_t_1574_, lean_object* v_done_1575_){
_start:
{
lean_object* v___x_1576_; 
v___x_1576_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1574_, v_done_1575_);
return v___x_1576_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Directive_done_elim(lean_object* v_motive_1577_, lean_object* v_t_1578_, lean_object* v_h_1579_, lean_object* v_done_1580_){
_start:
{
lean_object* v___x_1581_; 
v___x_1581_ = lp_algalVerification_Algal_Replay_Directive_ctorElim___redArg(v_t_1578_, v_done_1580_);
return v___x_1581_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq(lean_object* v_x_1582_, lean_object* v_x_1583_){
_start:
{
switch(lean_obj_tag(v_x_1582_))
{
case 0:
{
if (lean_obj_tag(v_x_1583_) == 0)
{
lean_object* v_a_1584_; lean_object* v_a_1585_; uint8_t v___x_1586_; 
v_a_1584_ = lean_ctor_get(v_x_1582_, 0);
lean_inc_ref(v_a_1584_);
lean_dec_ref_known(v_x_1582_, 1);
v_a_1585_ = lean_ctor_get(v_x_1583_, 0);
lean_inc_ref(v_a_1585_);
lean_dec_ref_known(v_x_1583_, 1);
v___x_1586_ = lp_algalVerification_Algal_Replay_instDecidableEqRequest_decEq(v_a_1584_, v_a_1585_);
lean_dec_ref(v_a_1585_);
lean_dec_ref(v_a_1584_);
return v___x_1586_;
}
else
{
uint8_t v___x_1587_; 
lean_dec_ref_known(v_x_1582_, 1);
lean_dec_ref(v_x_1583_);
v___x_1587_ = 0;
return v___x_1587_;
}
}
case 1:
{
if (lean_obj_tag(v_x_1583_) == 1)
{
lean_object* v_path_1588_; lean_object* v_name_1589_; lean_object* v_path_1590_; lean_object* v_name_1591_; uint8_t v___x_1592_; 
v_path_1588_ = lean_ctor_get(v_x_1582_, 0);
lean_inc_ref(v_path_1588_);
v_name_1589_ = lean_ctor_get(v_x_1582_, 1);
lean_inc_ref(v_name_1589_);
lean_dec_ref_known(v_x_1582_, 2);
v_path_1590_ = lean_ctor_get(v_x_1583_, 0);
lean_inc_ref(v_path_1590_);
v_name_1591_ = lean_ctor_get(v_x_1583_, 1);
lean_inc_ref(v_name_1591_);
lean_dec_ref_known(v_x_1583_, 2);
v___x_1592_ = lean_string_dec_eq(v_path_1588_, v_path_1590_);
lean_dec_ref(v_path_1590_);
lean_dec_ref(v_path_1588_);
if (v___x_1592_ == 0)
{
lean_dec_ref(v_name_1591_);
lean_dec_ref(v_name_1589_);
return v___x_1592_;
}
else
{
uint8_t v___x_1593_; 
v___x_1593_ = lean_string_dec_eq(v_name_1589_, v_name_1591_);
lean_dec_ref(v_name_1591_);
lean_dec_ref(v_name_1589_);
return v___x_1593_;
}
}
else
{
uint8_t v___x_1594_; 
lean_dec_ref_known(v_x_1582_, 2);
lean_dec_ref(v_x_1583_);
v___x_1594_ = 0;
return v___x_1594_;
}
}
case 2:
{
if (lean_obj_tag(v_x_1583_) == 2)
{
lean_object* v_path_1595_; lean_object* v_name_1596_; lean_object* v_data_1597_; lean_object* v_path_1598_; lean_object* v_name_1599_; lean_object* v_data_1600_; uint8_t v___x_1601_; 
v_path_1595_ = lean_ctor_get(v_x_1582_, 0);
lean_inc_ref(v_path_1595_);
v_name_1596_ = lean_ctor_get(v_x_1582_, 1);
lean_inc_ref(v_name_1596_);
v_data_1597_ = lean_ctor_get(v_x_1582_, 2);
lean_inc(v_data_1597_);
lean_dec_ref_known(v_x_1582_, 3);
v_path_1598_ = lean_ctor_get(v_x_1583_, 0);
lean_inc_ref(v_path_1598_);
v_name_1599_ = lean_ctor_get(v_x_1583_, 1);
lean_inc_ref(v_name_1599_);
v_data_1600_ = lean_ctor_get(v_x_1583_, 2);
lean_inc(v_data_1600_);
lean_dec_ref_known(v_x_1583_, 3);
v___x_1601_ = lean_string_dec_eq(v_path_1595_, v_path_1598_);
lean_dec_ref(v_path_1598_);
lean_dec_ref(v_path_1595_);
if (v___x_1601_ == 0)
{
lean_dec(v_data_1600_);
lean_dec_ref(v_name_1599_);
lean_dec(v_data_1597_);
lean_dec_ref(v_name_1596_);
return v___x_1601_;
}
else
{
uint8_t v___x_1602_; 
v___x_1602_ = lean_string_dec_eq(v_name_1596_, v_name_1599_);
lean_dec_ref(v_name_1599_);
lean_dec_ref(v_name_1596_);
if (v___x_1602_ == 0)
{
lean_dec(v_data_1600_);
lean_dec(v_data_1597_);
return v___x_1602_;
}
else
{
uint8_t v___x_1603_; 
v___x_1603_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_data_1597_, v_data_1600_);
lean_dec(v_data_1600_);
lean_dec(v_data_1597_);
return v___x_1603_;
}
}
}
else
{
uint8_t v___x_1604_; 
lean_dec_ref_known(v_x_1582_, 3);
lean_dec_ref(v_x_1583_);
v___x_1604_ = 0;
return v___x_1604_;
}
}
default: 
{
if (lean_obj_tag(v_x_1583_) == 3)
{
uint8_t v_outcome_1605_; lean_object* v_failure_1606_; uint8_t v_outcome_1607_; lean_object* v_failure_1608_; uint8_t v___x_1609_; 
v_outcome_1605_ = lean_ctor_get_uint8(v_x_1582_, sizeof(void*)*1);
v_failure_1606_ = lean_ctor_get(v_x_1582_, 0);
lean_inc(v_failure_1606_);
lean_dec_ref_known(v_x_1582_, 1);
v_outcome_1607_ = lean_ctor_get_uint8(v_x_1583_, sizeof(void*)*1);
v_failure_1608_ = lean_ctor_get(v_x_1583_, 0);
lean_inc(v_failure_1608_);
lean_dec_ref_known(v_x_1583_, 1);
v___x_1609_ = lp_algalVerification_Algal_Replay_instDecidableEqOutcome(v_outcome_1605_, v_outcome_1607_);
if (v___x_1609_ == 0)
{
lean_dec(v_failure_1608_);
lean_dec(v_failure_1606_);
return v___x_1609_;
}
else
{
lean_object* v___x_1610_; uint8_t v___x_1611_; 
v___x_1610_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed), 2, 0);
v___x_1611_ = l_Option_instDecidableEq___redArg(v___x_1610_, v_failure_1606_, v_failure_1608_);
return v___x_1611_;
}
}
else
{
uint8_t v___x_1612_; 
lean_dec_ref_known(v_x_1582_, 1);
lean_dec_ref(v_x_1583_);
v___x_1612_ = 0;
return v___x_1612_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq___boxed(lean_object* v_x_1613_, lean_object* v_x_1614_){
_start:
{
uint8_t v_res_1615_; lean_object* v_r_1616_; 
v_res_1615_ = lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq(v_x_1613_, v_x_1614_);
v_r_1616_ = lean_box(v_res_1615_);
return v_r_1616_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqDirective(lean_object* v_x_1617_, lean_object* v_x_1618_){
_start:
{
uint8_t v___x_1619_; 
v___x_1619_ = lp_algalVerification_Algal_Replay_instDecidableEqDirective_decEq(v_x_1617_, v_x_1618_);
return v___x_1619_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqDirective___boxed(lean_object* v_x_1620_, lean_object* v_x_1621_){
_start:
{
uint8_t v_res_1622_; lean_object* v_r_1623_; 
v_res_1622_ = lp_algalVerification_Algal_Replay_instDecidableEqDirective(v_x_1620_, v_x_1621_);
v_r_1623_ = lean_box(v_res_1622_);
return v_r_1623_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1(lean_object* v___f_1624_, lean_object* v_a_1625_, lean_object* v_b_1626_){
_start:
{
lean_object* v___x_1627_; uint8_t v___x_1628_; 
v___x_1627_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_1628_ = l_instDecidableEqProd___redArg(v___x_1627_, v___f_1624_, v_a_1625_, v_b_1626_);
return v___x_1628_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1___boxed(lean_object* v___f_1629_, lean_object* v_a_1630_, lean_object* v_b_1631_){
_start:
{
uint8_t v_res_1632_; lean_object* v_r_1633_; 
v_res_1632_ = lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___lam__1(v___f_1629_, v_a_1630_, v_b_1631_);
v_r_1633_ = lean_box(v_res_1632_);
return v_r_1633_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq(lean_object* v_x_1636_, lean_object* v_x_1637_){
_start:
{
lean_object* v_hist_1638_; lean_object* v_tape_1639_; lean_object* v_slots_1640_; lean_object* v_writes_1641_; lean_object* v_steps_1642_; lean_object* v_hist_1643_; lean_object* v_tape_1644_; lean_object* v_slots_1645_; lean_object* v_writes_1646_; lean_object* v_steps_1647_; lean_object* v___x_1648_; uint8_t v___x_1649_; 
v_hist_1638_ = lean_ctor_get(v_x_1636_, 0);
lean_inc(v_hist_1638_);
v_tape_1639_ = lean_ctor_get(v_x_1636_, 1);
lean_inc(v_tape_1639_);
v_slots_1640_ = lean_ctor_get(v_x_1636_, 2);
lean_inc(v_slots_1640_);
v_writes_1641_ = lean_ctor_get(v_x_1636_, 3);
lean_inc(v_writes_1641_);
v_steps_1642_ = lean_ctor_get(v_x_1636_, 4);
lean_inc(v_steps_1642_);
lean_dec_ref(v_x_1636_);
v_hist_1643_ = lean_ctor_get(v_x_1637_, 0);
lean_inc(v_hist_1643_);
v_tape_1644_ = lean_ctor_get(v_x_1637_, 1);
lean_inc(v_tape_1644_);
v_slots_1645_ = lean_ctor_get(v_x_1637_, 2);
lean_inc(v_slots_1645_);
v_writes_1646_ = lean_ctor_get(v_x_1637_, 3);
lean_inc(v_writes_1646_);
v_steps_1647_ = lean_ctor_get(v_x_1637_, 4);
lean_inc(v_steps_1647_);
lean_dec_ref(v_x_1637_);
v___x_1648_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqReply___boxed), 2, 0);
v___x_1649_ = l_instDecidableEqList___redArg(v___x_1648_, v_hist_1638_, v_hist_1643_);
if (v___x_1649_ == 0)
{
lean_dec(v_steps_1647_);
lean_dec(v_writes_1646_);
lean_dec(v_slots_1645_);
lean_dec(v_tape_1644_);
lean_dec(v_steps_1642_);
lean_dec(v_writes_1641_);
lean_dec(v_slots_1640_);
lean_dec(v_tape_1639_);
return v___x_1649_;
}
else
{
lean_object* v___x_1650_; uint8_t v___x_1651_; 
v___x_1650_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed), 2, 0);
v___x_1651_ = l_instDecidableEqList___redArg(v___x_1650_, v_tape_1639_, v_tape_1644_);
if (v___x_1651_ == 0)
{
lean_dec(v_steps_1647_);
lean_dec(v_writes_1646_);
lean_dec(v_slots_1645_);
lean_dec(v_steps_1642_);
lean_dec(v_writes_1641_);
lean_dec(v_slots_1640_);
return v___x_1651_;
}
else
{
lean_object* v___f_1652_; uint8_t v___x_1653_; 
v___f_1652_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instDecidableEqCellRecord_decEq___closed__0));
v___x_1653_ = l_instDecidableEqList___redArg(v___f_1652_, v_slots_1640_, v_slots_1645_);
if (v___x_1653_ == 0)
{
lean_dec(v_steps_1647_);
lean_dec(v_writes_1646_);
lean_dec(v_steps_1642_);
lean_dec(v_writes_1641_);
return v___x_1653_;
}
else
{
lean_object* v___f_1654_; uint8_t v___x_1655_; 
v___f_1654_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___closed__0));
v___x_1655_ = l_instDecidableEqList___redArg(v___f_1654_, v_writes_1641_, v_writes_1646_);
if (v___x_1655_ == 0)
{
lean_dec(v_steps_1647_);
lean_dec(v_steps_1642_);
return v___x_1655_;
}
else
{
uint8_t v___x_1656_; 
v___x_1656_ = lean_nat_dec_eq(v_steps_1642_, v_steps_1647_);
lean_dec(v_steps_1647_);
lean_dec(v_steps_1642_);
return v___x_1656_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq___boxed(lean_object* v_x_1657_, lean_object* v_x_1658_){
_start:
{
uint8_t v_res_1659_; lean_object* v_r_1660_; 
v_res_1659_ = lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq(v_x_1657_, v_x_1658_);
v_r_1660_ = lean_box(v_res_1659_);
return v_r_1660_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqSt(lean_object* v_x_1661_, lean_object* v_x_1662_){
_start:
{
uint8_t v___x_1663_; 
v___x_1663_ = lp_algalVerification_Algal_Replay_instDecidableEqSt_decEq(v_x_1661_, v_x_1662_);
return v___x_1663_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqSt___boxed(lean_object* v_x_1664_, lean_object* v_x_1665_){
_start:
{
uint8_t v_res_1666_; lean_object* v_r_1667_; 
v_res_1666_ = lp_algalVerification_Algal_Replay_instDecidableEqSt(v_x_1664_, v_x_1665_);
v_r_1667_ = lean_box(v_res_1666_);
return v_r_1667_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorIdx(lean_object* v_x_1668_){
_start:
{
switch(lean_obj_tag(v_x_1668_))
{
case 0:
{
lean_object* v___x_1669_; 
v___x_1669_ = lean_unsigned_to_nat(0u);
return v___x_1669_;
}
case 1:
{
lean_object* v___x_1670_; 
v___x_1670_ = lean_unsigned_to_nat(1u);
return v___x_1670_;
}
default: 
{
lean_object* v___x_1671_; 
v___x_1671_ = lean_unsigned_to_nat(2u);
return v___x_1671_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorIdx___boxed(lean_object* v_x_1672_){
_start:
{
lean_object* v_res_1673_; 
v_res_1673_ = lp_algalVerification_Algal_Replay_EndMarker_ctorIdx(v_x_1672_);
lean_dec(v_x_1672_);
return v_res_1673_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(lean_object* v_t_1674_, lean_object* v_k_1675_){
_start:
{
if (lean_obj_tag(v_t_1674_) == 0)
{
uint8_t v_outcome_1676_; lean_object* v_failure_1677_; lean_object* v___x_1678_; lean_object* v___x_1679_; 
v_outcome_1676_ = lean_ctor_get_uint8(v_t_1674_, sizeof(void*)*1);
v_failure_1677_ = lean_ctor_get(v_t_1674_, 0);
lean_inc(v_failure_1677_);
lean_dec_ref_known(v_t_1674_, 1);
v___x_1678_ = lean_box(v_outcome_1676_);
v___x_1679_ = lean_apply_2(v_k_1675_, v___x_1678_, v_failure_1677_);
return v___x_1679_;
}
else
{
lean_dec(v_t_1674_);
return v_k_1675_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim(lean_object* v_motive_1680_, lean_object* v_ctorIdx_1681_, lean_object* v_t_1682_, lean_object* v_h_1683_, lean_object* v_k_1684_){
_start:
{
lean_object* v___x_1685_; 
v___x_1685_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1682_, v_k_1684_);
return v___x_1685_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_ctorElim___boxed(lean_object* v_motive_1686_, lean_object* v_ctorIdx_1687_, lean_object* v_t_1688_, lean_object* v_h_1689_, lean_object* v_k_1690_){
_start:
{
lean_object* v_res_1691_; 
v_res_1691_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim(v_motive_1686_, v_ctorIdx_1687_, v_t_1688_, v_h_1689_, v_k_1690_);
lean_dec(v_ctorIdx_1687_);
return v_res_1691_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_done_elim___redArg(lean_object* v_t_1692_, lean_object* v_done_1693_){
_start:
{
lean_object* v___x_1694_; 
v___x_1694_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1692_, v_done_1693_);
return v___x_1694_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_done_elim(lean_object* v_motive_1695_, lean_object* v_t_1696_, lean_object* v_h_1697_, lean_object* v_done_1698_){
_start:
{
lean_object* v___x_1699_; 
v___x_1699_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1696_, v_done_1698_);
return v___x_1699_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_suspendedEnd_elim___redArg(lean_object* v_t_1700_, lean_object* v_suspendedEnd_1701_){
_start:
{
lean_object* v___x_1702_; 
v___x_1702_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1700_, v_suspendedEnd_1701_);
return v___x_1702_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_suspendedEnd_elim(lean_object* v_motive_1703_, lean_object* v_t_1704_, lean_object* v_h_1705_, lean_object* v_suspendedEnd_1706_){
_start:
{
lean_object* v___x_1707_; 
v___x_1707_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1704_, v_suspendedEnd_1706_);
return v___x_1707_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_exhausted_elim___redArg(lean_object* v_t_1708_, lean_object* v_exhausted_1709_){
_start:
{
lean_object* v___x_1710_; 
v___x_1710_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1708_, v_exhausted_1709_);
return v___x_1710_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EndMarker_exhausted_elim(lean_object* v_motive_1711_, lean_object* v_t_1712_, lean_object* v_h_1713_, lean_object* v_exhausted_1714_){
_start:
{
lean_object* v___x_1715_; 
v___x_1715_ = lp_algalVerification_Algal_Replay_EndMarker_ctorElim___redArg(v_t_1712_, v_exhausted_1714_);
return v___x_1715_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq(lean_object* v_x_1716_, lean_object* v_x_1717_){
_start:
{
switch(lean_obj_tag(v_x_1716_))
{
case 0:
{
uint8_t v_outcome_1718_; lean_object* v_failure_1719_; uint8_t v___x_1720_; 
v_outcome_1718_ = lean_ctor_get_uint8(v_x_1716_, sizeof(void*)*1);
v_failure_1719_ = lean_ctor_get(v_x_1716_, 0);
lean_inc(v_failure_1719_);
lean_dec_ref_known(v_x_1716_, 1);
v___x_1720_ = 0;
if (lean_obj_tag(v_x_1717_) == 0)
{
uint8_t v_outcome_1721_; lean_object* v_failure_1722_; uint8_t v___x_1723_; 
v_outcome_1721_ = lean_ctor_get_uint8(v_x_1717_, sizeof(void*)*1);
v_failure_1722_ = lean_ctor_get(v_x_1717_, 0);
lean_inc(v_failure_1722_);
lean_dec_ref_known(v_x_1717_, 1);
v___x_1723_ = lp_algalVerification_Algal_Replay_instDecidableEqOutcome(v_outcome_1718_, v_outcome_1721_);
if (v___x_1723_ == 0)
{
lean_dec(v_failure_1722_);
lean_dec(v_failure_1719_);
return v___x_1720_;
}
else
{
lean_object* v___x_1724_; uint8_t v___x_1725_; 
v___x_1724_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed), 2, 0);
v___x_1725_ = l_Option_instDecidableEq___redArg(v___x_1724_, v_failure_1719_, v_failure_1722_);
if (v___x_1725_ == 0)
{
return v___x_1720_;
}
else
{
return v___x_1725_;
}
}
}
else
{
lean_dec(v_failure_1719_);
lean_dec(v_x_1717_);
return v___x_1720_;
}
}
case 1:
{
if (lean_obj_tag(v_x_1717_) == 1)
{
uint8_t v___x_1726_; 
v___x_1726_ = 1;
return v___x_1726_;
}
else
{
uint8_t v___x_1727_; 
lean_dec(v_x_1717_);
v___x_1727_ = 0;
return v___x_1727_;
}
}
default: 
{
if (lean_obj_tag(v_x_1717_) == 2)
{
uint8_t v___x_1728_; 
v___x_1728_ = 1;
return v___x_1728_;
}
else
{
uint8_t v___x_1729_; 
lean_dec(v_x_1717_);
v___x_1729_ = 0;
return v___x_1729_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq___boxed(lean_object* v_x_1730_, lean_object* v_x_1731_){
_start:
{
uint8_t v_res_1732_; lean_object* v_r_1733_; 
v_res_1732_ = lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq(v_x_1730_, v_x_1731_);
v_r_1733_ = lean_box(v_res_1732_);
return v_r_1733_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEndMarker(lean_object* v_x_1734_, lean_object* v_x_1735_){
_start:
{
uint8_t v___x_1736_; 
v___x_1736_ = lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq(v_x_1734_, v_x_1735_);
return v___x_1736_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEndMarker___boxed(lean_object* v_x_1737_, lean_object* v_x_1738_){
_start:
{
uint8_t v_res_1739_; lean_object* v_r_1740_; 
v_res_1739_ = lp_algalVerification_Algal_Replay_instDecidableEqEndMarker(v_x_1737_, v_x_1738_);
v_r_1740_ = lean_box(v_res_1739_);
return v_r_1740_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0(lean_object* v_x_1747_, lean_object* v_x_1748_){
_start:
{
if (lean_obj_tag(v_x_1747_) == 0)
{
lean_object* v___x_1749_; 
v___x_1749_ = ((lean_object*)(lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__1));
return v___x_1749_;
}
else
{
lean_object* v_val_1750_; lean_object* v___x_1751_; lean_object* v___x_1752_; uint8_t v___x_1753_; lean_object* v___x_1754_; lean_object* v___x_1755_; lean_object* v___x_1756_; 
v_val_1750_ = lean_ctor_get(v_x_1747_, 0);
v___x_1751_ = ((lean_object*)(lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___closed__3));
v___x_1752_ = lean_unsigned_to_nat(1024u);
v___x_1753_ = lean_unbox(v_val_1750_);
v___x_1754_ = lp_algalVerification_Algal_Replay_instReprErrorCode_repr(v___x_1753_, v___x_1752_);
v___x_1755_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1755_, 0, v___x_1751_);
lean_ctor_set(v___x_1755_, 1, v___x_1754_);
v___x_1756_ = l_Repr_addAppParen(v___x_1755_, v_x_1748_);
return v___x_1756_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0___boxed(lean_object* v_x_1757_, lean_object* v_x_1758_){
_start:
{
lean_object* v_res_1759_; 
v_res_1759_ = lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0(v_x_1757_, v_x_1758_);
lean_dec(v_x_1758_);
lean_dec(v_x_1757_);
return v_res_1759_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr(lean_object* v_x_1772_, lean_object* v_prec_1773_){
_start:
{
lean_object* v___y_1775_; lean_object* v___y_1782_; 
switch(lean_obj_tag(v_x_1772_))
{
case 0:
{
uint8_t v_outcome_1788_; lean_object* v_failure_1789_; lean_object* v___x_1791_; uint8_t v_isShared_1792_; uint8_t v_isSharedCheck_1813_; 
v_outcome_1788_ = lean_ctor_get_uint8(v_x_1772_, sizeof(void*)*1);
v_failure_1789_ = lean_ctor_get(v_x_1772_, 0);
v_isSharedCheck_1813_ = !lean_is_exclusive(v_x_1772_);
if (v_isSharedCheck_1813_ == 0)
{
v___x_1791_ = v_x_1772_;
v_isShared_1792_ = v_isSharedCheck_1813_;
goto v_resetjp_1790_;
}
else
{
lean_inc(v_failure_1789_);
lean_dec(v_x_1772_);
v___x_1791_ = lean_box(0);
v_isShared_1792_ = v_isSharedCheck_1813_;
goto v_resetjp_1790_;
}
v_resetjp_1790_:
{
lean_object* v___y_1794_; lean_object* v___x_1809_; uint8_t v___x_1810_; 
v___x_1809_ = lean_unsigned_to_nat(1024u);
v___x_1810_ = lean_nat_dec_le(v___x_1809_, v_prec_1773_);
if (v___x_1810_ == 0)
{
lean_object* v___x_1811_; 
v___x_1811_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1794_ = v___x_1811_;
goto v___jp_1793_;
}
else
{
lean_object* v___x_1812_; 
v___x_1812_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1794_ = v___x_1812_;
goto v___jp_1793_;
}
v___jp_1793_:
{
lean_object* v___x_1795_; lean_object* v___x_1796_; lean_object* v___x_1797_; lean_object* v___x_1798_; lean_object* v___x_1799_; lean_object* v___x_1800_; lean_object* v___x_1801_; lean_object* v___x_1802_; lean_object* v___x_1803_; uint8_t v___x_1804_; lean_object* v___x_1806_; 
v___x_1795_ = lean_box(1);
v___x_1796_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__6));
v___x_1797_ = lean_unsigned_to_nat(1024u);
v___x_1798_ = lp_algalVerification_Algal_Replay_instReprOutcome_repr(v_outcome_1788_, v___x_1797_);
v___x_1799_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1799_, 0, v___x_1796_);
lean_ctor_set(v___x_1799_, 1, v___x_1798_);
v___x_1800_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1800_, 0, v___x_1799_);
lean_ctor_set(v___x_1800_, 1, v___x_1795_);
v___x_1801_ = lp_algalVerification_Option_repr___at___00Algal_Replay_instReprEndMarker_repr_spec__0(v_failure_1789_, v___x_1797_);
lean_dec(v_failure_1789_);
v___x_1802_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1802_, 0, v___x_1800_);
lean_ctor_set(v___x_1802_, 1, v___x_1801_);
lean_inc(v___y_1794_);
v___x_1803_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1803_, 0, v___y_1794_);
lean_ctor_set(v___x_1803_, 1, v___x_1802_);
v___x_1804_ = 0;
if (v_isShared_1792_ == 0)
{
lean_ctor_set_tag(v___x_1791_, 6);
lean_ctor_set(v___x_1791_, 0, v___x_1803_);
v___x_1806_ = v___x_1791_;
goto v_reusejp_1805_;
}
else
{
lean_object* v_reuseFailAlloc_1808_; 
v_reuseFailAlloc_1808_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v_reuseFailAlloc_1808_, 0, v___x_1803_);
v___x_1806_ = v_reuseFailAlloc_1808_;
goto v_reusejp_1805_;
}
v_reusejp_1805_:
{
lean_object* v___x_1807_; 
lean_ctor_set_uint8(v___x_1806_, sizeof(void*)*1, v___x_1804_);
v___x_1807_ = l_Repr_addAppParen(v___x_1806_, v_prec_1773_);
return v___x_1807_;
}
}
}
}
case 1:
{
lean_object* v___x_1814_; uint8_t v___x_1815_; 
v___x_1814_ = lean_unsigned_to_nat(1024u);
v___x_1815_ = lean_nat_dec_le(v___x_1814_, v_prec_1773_);
if (v___x_1815_ == 0)
{
lean_object* v___x_1816_; 
v___x_1816_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1775_ = v___x_1816_;
goto v___jp_1774_;
}
else
{
lean_object* v___x_1817_; 
v___x_1817_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1775_ = v___x_1817_;
goto v___jp_1774_;
}
}
default: 
{
lean_object* v___x_1818_; uint8_t v___x_1819_; 
v___x_1818_ = lean_unsigned_to_nat(1024u);
v___x_1819_ = lean_nat_dec_le(v___x_1818_, v_prec_1773_);
if (v___x_1819_ == 0)
{
lean_object* v___x_1820_; 
v___x_1820_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_1782_ = v___x_1820_;
goto v___jp_1781_;
}
else
{
lean_object* v___x_1821_; 
v___x_1821_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_1782_ = v___x_1821_;
goto v___jp_1781_;
}
}
}
v___jp_1774_:
{
lean_object* v___x_1776_; lean_object* v___x_1777_; uint8_t v___x_1778_; lean_object* v___x_1779_; lean_object* v___x_1780_; 
v___x_1776_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__1));
lean_inc(v___y_1775_);
v___x_1777_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1777_, 0, v___y_1775_);
lean_ctor_set(v___x_1777_, 1, v___x_1776_);
v___x_1778_ = 0;
v___x_1779_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1779_, 0, v___x_1777_);
lean_ctor_set_uint8(v___x_1779_, sizeof(void*)*1, v___x_1778_);
v___x_1780_ = l_Repr_addAppParen(v___x_1779_, v_prec_1773_);
return v___x_1780_;
}
v___jp_1781_:
{
lean_object* v___x_1783_; lean_object* v___x_1784_; uint8_t v___x_1785_; lean_object* v___x_1786_; lean_object* v___x_1787_; 
v___x_1783_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEndMarker_repr___closed__3));
lean_inc(v___y_1782_);
v___x_1784_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1784_, 0, v___y_1782_);
lean_ctor_set(v___x_1784_, 1, v___x_1783_);
v___x_1785_ = 0;
v___x_1786_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1786_, 0, v___x_1784_);
lean_ctor_set_uint8(v___x_1786_, sizeof(void*)*1, v___x_1785_);
v___x_1787_ = l_Repr_addAppParen(v___x_1786_, v_prec_1773_);
return v___x_1787_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEndMarker_repr___boxed(lean_object* v_x_1822_, lean_object* v_prec_1823_){
_start:
{
lean_object* v_res_1824_; 
v_res_1824_ = lp_algalVerification_Algal_Replay_instReprEndMarker_repr(v_x_1822_, v_prec_1823_);
lean_dec(v_prec_1823_);
return v_res_1824_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0(lean_object* v_x_1827_, lean_object* v_x_1828_){
_start:
{
if (lean_obj_tag(v_x_1827_) == 0)
{
if (lean_obj_tag(v_x_1828_) == 0)
{
uint8_t v___x_1829_; 
v___x_1829_ = 1;
return v___x_1829_;
}
else
{
uint8_t v___x_1830_; 
v___x_1830_ = 0;
return v___x_1830_;
}
}
else
{
if (lean_obj_tag(v_x_1828_) == 0)
{
uint8_t v___x_1831_; 
v___x_1831_ = 0;
return v___x_1831_;
}
else
{
lean_object* v_val_1832_; lean_object* v_val_1833_; uint8_t v___x_1834_; uint8_t v___x_1835_; uint8_t v___x_1836_; 
v_val_1832_ = lean_ctor_get(v_x_1827_, 0);
v_val_1833_ = lean_ctor_get(v_x_1828_, 0);
v___x_1834_ = lean_unbox(v_val_1832_);
v___x_1835_ = lean_unbox(v_val_1833_);
v___x_1836_ = lp_algalVerification_Algal_Replay_instBEqErrorCode_beq(v___x_1834_, v___x_1835_);
return v___x_1836_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0___boxed(lean_object* v_x_1837_, lean_object* v_x_1838_){
_start:
{
uint8_t v_res_1839_; lean_object* v_r_1840_; 
v_res_1839_ = lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0(v_x_1837_, v_x_1838_);
lean_dec(v_x_1838_);
lean_dec(v_x_1837_);
v_r_1840_ = lean_box(v_res_1839_);
return v_r_1840_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqEndMarker_beq(lean_object* v_x_1841_, lean_object* v_x_1842_){
_start:
{
switch(lean_obj_tag(v_x_1841_))
{
case 0:
{
if (lean_obj_tag(v_x_1842_) == 0)
{
uint8_t v_outcome_1843_; lean_object* v_failure_1844_; uint8_t v_outcome_1845_; lean_object* v_failure_1846_; uint8_t v___x_1847_; 
v_outcome_1843_ = lean_ctor_get_uint8(v_x_1841_, sizeof(void*)*1);
v_failure_1844_ = lean_ctor_get(v_x_1841_, 0);
v_outcome_1845_ = lean_ctor_get_uint8(v_x_1842_, sizeof(void*)*1);
v_failure_1846_ = lean_ctor_get(v_x_1842_, 0);
v___x_1847_ = lp_algalVerification_Algal_Replay_instBEqOutcome_beq(v_outcome_1843_, v_outcome_1845_);
if (v___x_1847_ == 0)
{
return v___x_1847_;
}
else
{
uint8_t v___x_1848_; 
v___x_1848_ = lp_algalVerification_Option_instBEq_beq___at___00Algal_Replay_instBEqEndMarker_beq_spec__0(v_failure_1844_, v_failure_1846_);
return v___x_1848_;
}
}
else
{
uint8_t v___x_1849_; 
v___x_1849_ = 0;
return v___x_1849_;
}
}
case 1:
{
if (lean_obj_tag(v_x_1842_) == 1)
{
uint8_t v___x_1850_; 
v___x_1850_ = 1;
return v___x_1850_;
}
else
{
uint8_t v___x_1851_; 
v___x_1851_ = 0;
return v___x_1851_;
}
}
default: 
{
if (lean_obj_tag(v_x_1842_) == 2)
{
uint8_t v___x_1852_; 
v___x_1852_ = 1;
return v___x_1852_;
}
else
{
uint8_t v___x_1853_; 
v___x_1853_ = 0;
return v___x_1853_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqEndMarker_beq___boxed(lean_object* v_x_1854_, lean_object* v_x_1855_){
_start:
{
uint8_t v_res_1856_; lean_object* v_r_1857_; 
v_res_1856_ = lp_algalVerification_Algal_Replay_instBEqEndMarker_beq(v_x_1854_, v_x_1855_);
lean_dec(v_x_1855_);
lean_dec(v_x_1854_);
v_r_1857_ = lean_box(v_res_1856_);
return v_r_1857_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_steps(lean_object* v_cfg_1860_, lean_object* v_p_1861_, lean_object* v_args_1862_, lean_object* v_x_1863_, lean_object* v_x_1864_){
_start:
{
lean_object* v_zero_1865_; uint8_t v_isZero_1866_; 
v_zero_1865_ = lean_unsigned_to_nat(0u);
v_isZero_1866_ = lean_nat_dec_eq(v_x_1863_, v_zero_1865_);
if (v_isZero_1866_ == 1)
{
lean_object* v___x_1867_; lean_object* v___x_1868_; lean_object* v___x_1869_; lean_object* v___x_1870_; 
lean_dec(v_x_1863_);
lean_dec(v_args_1862_);
lean_dec_ref(v_p_1861_);
lean_dec_ref(v_cfg_1860_);
v___x_1867_ = lean_box(0);
v___x_1868_ = lean_box(2);
v___x_1869_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1869_, 0, v_x_1864_);
lean_ctor_set(v___x_1869_, 1, v___x_1868_);
v___x_1870_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1870_, 0, v___x_1867_);
lean_ctor_set(v___x_1870_, 1, v___x_1869_);
return v___x_1870_;
}
else
{
lean_object* v_decide_1871_; lean_object* v_hist_1872_; lean_object* v_tape_1873_; lean_object* v_slots_1874_; lean_object* v_writes_1875_; lean_object* v_steps_1876_; lean_object* v_one_1877_; lean_object* v_n_1878_; lean_object* v___x_1879_; 
v_decide_1871_ = lean_ctor_get(v_p_1861_, 4);
v_hist_1872_ = lean_ctor_get(v_x_1864_, 0);
v_tape_1873_ = lean_ctor_get(v_x_1864_, 1);
v_slots_1874_ = lean_ctor_get(v_x_1864_, 2);
v_writes_1875_ = lean_ctor_get(v_x_1864_, 3);
v_steps_1876_ = lean_ctor_get(v_x_1864_, 4);
v_one_1877_ = lean_unsigned_to_nat(1u);
v_n_1878_ = lean_nat_sub(v_x_1863_, v_one_1877_);
lean_dec(v_x_1863_);
lean_inc_ref(v_decide_1871_);
lean_inc(v_hist_1872_);
lean_inc(v_args_1862_);
v___x_1879_ = lean_apply_2(v_decide_1871_, v_args_1862_, v_hist_1872_);
switch(lean_obj_tag(v___x_1879_))
{
case 0:
{
lean_object* v___x_1881_; uint8_t v_isShared_1882_; uint8_t v_isSharedCheck_1916_; 
lean_inc(v_steps_1876_);
lean_inc(v_writes_1875_);
lean_inc(v_slots_1874_);
lean_inc(v_tape_1873_);
lean_inc(v_hist_1872_);
v_isSharedCheck_1916_ = !lean_is_exclusive(v_x_1864_);
if (v_isSharedCheck_1916_ == 0)
{
lean_object* v_unused_1917_; lean_object* v_unused_1918_; lean_object* v_unused_1919_; lean_object* v_unused_1920_; lean_object* v_unused_1921_; 
v_unused_1917_ = lean_ctor_get(v_x_1864_, 4);
lean_dec(v_unused_1917_);
v_unused_1918_ = lean_ctor_get(v_x_1864_, 3);
lean_dec(v_unused_1918_);
v_unused_1919_ = lean_ctor_get(v_x_1864_, 2);
lean_dec(v_unused_1919_);
v_unused_1920_ = lean_ctor_get(v_x_1864_, 1);
lean_dec(v_unused_1920_);
v_unused_1921_ = lean_ctor_get(v_x_1864_, 0);
lean_dec(v_unused_1921_);
v___x_1881_ = v_x_1864_;
v_isShared_1882_ = v_isSharedCheck_1916_;
goto v_resetjp_1880_;
}
else
{
lean_dec(v_x_1864_);
v___x_1881_ = lean_box(0);
v_isShared_1882_ = v_isSharedCheck_1916_;
goto v_resetjp_1880_;
}
v_resetjp_1880_:
{
lean_object* v_a_1883_; lean_object* v___x_1884_; lean_object* v_fst_1885_; lean_object* v_snd_1886_; lean_object* v___x_1888_; uint8_t v_isShared_1889_; uint8_t v_isSharedCheck_1915_; 
v_a_1883_ = lean_ctor_get(v___x_1879_, 0);
lean_inc_ref(v_a_1883_);
lean_dec_ref_known(v___x_1879_, 1);
lean_inc_ref(v_cfg_1860_);
v___x_1884_ = lp_algalVerification_Algal_Replay_dispatch(v_cfg_1860_, v_tape_1873_, v_a_1883_);
v_fst_1885_ = lean_ctor_get(v___x_1884_, 0);
v_snd_1886_ = lean_ctor_get(v___x_1884_, 1);
v_isSharedCheck_1915_ = !lean_is_exclusive(v___x_1884_);
if (v_isSharedCheck_1915_ == 0)
{
v___x_1888_ = v___x_1884_;
v_isShared_1889_ = v_isSharedCheck_1915_;
goto v_resetjp_1887_;
}
else
{
lean_inc(v_snd_1886_);
lean_inc(v_fst_1885_);
lean_dec(v___x_1884_);
v___x_1888_ = lean_box(0);
v_isShared_1889_ = v_isSharedCheck_1915_;
goto v_resetjp_1887_;
}
v_resetjp_1887_:
{
lean_object* v_reply_1890_; lean_object* v___x_1891_; lean_object* v___x_1892_; lean_object* v___x_1893_; lean_object* v___x_1894_; lean_object* v_s_x27_1896_; 
v_reply_1890_ = lean_ctor_get(v_fst_1885_, 1);
v___x_1891_ = lean_box(0);
lean_inc(v_reply_1890_);
v___x_1892_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1892_, 0, v_reply_1890_);
lean_ctor_set(v___x_1892_, 1, v___x_1891_);
v___x_1893_ = l_List_appendTR___redArg(v_hist_1872_, v___x_1892_);
v___x_1894_ = lean_nat_add(v_steps_1876_, v_one_1877_);
lean_dec(v_steps_1876_);
if (v_isShared_1882_ == 0)
{
lean_ctor_set(v___x_1881_, 4, v___x_1894_);
lean_ctor_set(v___x_1881_, 1, v_snd_1886_);
lean_ctor_set(v___x_1881_, 0, v___x_1893_);
v_s_x27_1896_ = v___x_1881_;
goto v_reusejp_1895_;
}
else
{
lean_object* v_reuseFailAlloc_1914_; 
v_reuseFailAlloc_1914_ = lean_alloc_ctor(0, 5, 0);
lean_ctor_set(v_reuseFailAlloc_1914_, 0, v___x_1893_);
lean_ctor_set(v_reuseFailAlloc_1914_, 1, v_snd_1886_);
lean_ctor_set(v_reuseFailAlloc_1914_, 2, v_slots_1874_);
lean_ctor_set(v_reuseFailAlloc_1914_, 3, v_writes_1875_);
lean_ctor_set(v_reuseFailAlloc_1914_, 4, v___x_1894_);
v_s_x27_1896_ = v_reuseFailAlloc_1914_;
goto v_reusejp_1895_;
}
v_reusejp_1895_:
{
if (lean_obj_tag(v_reply_1890_) == 2)
{
lean_object* v___x_1897_; lean_object* v___x_1898_; lean_object* v___x_1900_; 
lean_dec(v_n_1878_);
lean_dec(v_args_1862_);
lean_dec_ref(v_p_1861_);
lean_dec_ref(v_cfg_1860_);
v___x_1897_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1897_, 0, v_fst_1885_);
lean_ctor_set(v___x_1897_, 1, v___x_1891_);
v___x_1898_ = lean_box(1);
if (v_isShared_1889_ == 0)
{
lean_ctor_set(v___x_1888_, 1, v___x_1898_);
lean_ctor_set(v___x_1888_, 0, v_s_x27_1896_);
v___x_1900_ = v___x_1888_;
goto v_reusejp_1899_;
}
else
{
lean_object* v_reuseFailAlloc_1902_; 
v_reuseFailAlloc_1902_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1902_, 0, v_s_x27_1896_);
lean_ctor_set(v_reuseFailAlloc_1902_, 1, v___x_1898_);
v___x_1900_ = v_reuseFailAlloc_1902_;
goto v_reusejp_1899_;
}
v_reusejp_1899_:
{
lean_object* v___x_1901_; 
v___x_1901_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1901_, 0, v___x_1897_);
lean_ctor_set(v___x_1901_, 1, v___x_1900_);
return v___x_1901_;
}
}
else
{
lean_object* v___x_1903_; lean_object* v_fst_1904_; lean_object* v_snd_1905_; lean_object* v___x_1907_; uint8_t v_isShared_1908_; uint8_t v_isSharedCheck_1913_; 
lean_del_object(v___x_1888_);
v___x_1903_ = lp_algalVerification_Algal_Replay_steps(v_cfg_1860_, v_p_1861_, v_args_1862_, v_n_1878_, v_s_x27_1896_);
v_fst_1904_ = lean_ctor_get(v___x_1903_, 0);
v_snd_1905_ = lean_ctor_get(v___x_1903_, 1);
v_isSharedCheck_1913_ = !lean_is_exclusive(v___x_1903_);
if (v_isSharedCheck_1913_ == 0)
{
v___x_1907_ = v___x_1903_;
v_isShared_1908_ = v_isSharedCheck_1913_;
goto v_resetjp_1906_;
}
else
{
lean_inc(v_snd_1905_);
lean_inc(v_fst_1904_);
lean_dec(v___x_1903_);
v___x_1907_ = lean_box(0);
v_isShared_1908_ = v_isSharedCheck_1913_;
goto v_resetjp_1906_;
}
v_resetjp_1906_:
{
lean_object* v___x_1909_; lean_object* v___x_1911_; 
v___x_1909_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1909_, 0, v_fst_1885_);
lean_ctor_set(v___x_1909_, 1, v_fst_1904_);
if (v_isShared_1908_ == 0)
{
lean_ctor_set(v___x_1907_, 0, v___x_1909_);
v___x_1911_ = v___x_1907_;
goto v_reusejp_1910_;
}
else
{
lean_object* v_reuseFailAlloc_1912_; 
v_reuseFailAlloc_1912_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1912_, 0, v___x_1909_);
lean_ctor_set(v_reuseFailAlloc_1912_, 1, v_snd_1905_);
v___x_1911_ = v_reuseFailAlloc_1912_;
goto v_reusejp_1910_;
}
v_reusejp_1910_:
{
return v___x_1911_;
}
}
}
}
}
}
}
case 1:
{
lean_object* v___x_1923_; uint8_t v_isShared_1924_; uint8_t v_isSharedCheck_1942_; 
lean_inc(v_steps_1876_);
lean_inc(v_writes_1875_);
lean_inc(v_slots_1874_);
lean_inc(v_tape_1873_);
lean_inc(v_hist_1872_);
v_isSharedCheck_1942_ = !lean_is_exclusive(v_x_1864_);
if (v_isSharedCheck_1942_ == 0)
{
lean_object* v_unused_1943_; lean_object* v_unused_1944_; lean_object* v_unused_1945_; lean_object* v_unused_1946_; lean_object* v_unused_1947_; 
v_unused_1943_ = lean_ctor_get(v_x_1864_, 4);
lean_dec(v_unused_1943_);
v_unused_1944_ = lean_ctor_get(v_x_1864_, 3);
lean_dec(v_unused_1944_);
v_unused_1945_ = lean_ctor_get(v_x_1864_, 2);
lean_dec(v_unused_1945_);
v_unused_1946_ = lean_ctor_get(v_x_1864_, 1);
lean_dec(v_unused_1946_);
v_unused_1947_ = lean_ctor_get(v_x_1864_, 0);
lean_dec(v_unused_1947_);
v___x_1923_ = v_x_1864_;
v_isShared_1924_ = v_isSharedCheck_1942_;
goto v_resetjp_1922_;
}
else
{
lean_dec(v_x_1864_);
v___x_1923_ = lean_box(0);
v_isShared_1924_ = v_isSharedCheck_1942_;
goto v_resetjp_1922_;
}
v_resetjp_1922_:
{
lean_object* v_path_1925_; lean_object* v_name_1926_; lean_object* v___x_1928_; uint8_t v_isShared_1929_; uint8_t v_isSharedCheck_1941_; 
v_path_1925_ = lean_ctor_get(v___x_1879_, 0);
v_name_1926_ = lean_ctor_get(v___x_1879_, 1);
v_isSharedCheck_1941_ = !lean_is_exclusive(v___x_1879_);
if (v_isSharedCheck_1941_ == 0)
{
v___x_1928_ = v___x_1879_;
v_isShared_1929_ = v_isSharedCheck_1941_;
goto v_resetjp_1927_;
}
else
{
lean_inc(v_name_1926_);
lean_inc(v_path_1925_);
lean_dec(v___x_1879_);
v___x_1928_ = lean_box(0);
v_isShared_1929_ = v_isSharedCheck_1941_;
goto v_resetjp_1927_;
}
v_resetjp_1927_:
{
lean_object* v_reply_1930_; lean_object* v___x_1931_; lean_object* v___x_1933_; 
lean_inc_ref(v_cfg_1860_);
v_reply_1930_ = lp_algalVerification_Algal_Replay_resolveSlotRead(v_cfg_1860_, v_slots_1874_, v_path_1925_, v_name_1926_);
lean_dec_ref(v_name_1926_);
v___x_1931_ = lean_box(0);
if (v_isShared_1929_ == 0)
{
lean_ctor_set(v___x_1928_, 1, v___x_1931_);
lean_ctor_set(v___x_1928_, 0, v_reply_1930_);
v___x_1933_ = v___x_1928_;
goto v_reusejp_1932_;
}
else
{
lean_object* v_reuseFailAlloc_1940_; 
v_reuseFailAlloc_1940_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1940_, 0, v_reply_1930_);
lean_ctor_set(v_reuseFailAlloc_1940_, 1, v___x_1931_);
v___x_1933_ = v_reuseFailAlloc_1940_;
goto v_reusejp_1932_;
}
v_reusejp_1932_:
{
lean_object* v___x_1934_; lean_object* v___x_1935_; lean_object* v___x_1937_; 
v___x_1934_ = l_List_appendTR___redArg(v_hist_1872_, v___x_1933_);
v___x_1935_ = lean_nat_add(v_steps_1876_, v_one_1877_);
lean_dec(v_steps_1876_);
if (v_isShared_1924_ == 0)
{
lean_ctor_set(v___x_1923_, 4, v___x_1935_);
lean_ctor_set(v___x_1923_, 0, v___x_1934_);
v___x_1937_ = v___x_1923_;
goto v_reusejp_1936_;
}
else
{
lean_object* v_reuseFailAlloc_1939_; 
v_reuseFailAlloc_1939_ = lean_alloc_ctor(0, 5, 0);
lean_ctor_set(v_reuseFailAlloc_1939_, 0, v___x_1934_);
lean_ctor_set(v_reuseFailAlloc_1939_, 1, v_tape_1873_);
lean_ctor_set(v_reuseFailAlloc_1939_, 2, v_slots_1874_);
lean_ctor_set(v_reuseFailAlloc_1939_, 3, v_writes_1875_);
lean_ctor_set(v_reuseFailAlloc_1939_, 4, v___x_1935_);
v___x_1937_ = v_reuseFailAlloc_1939_;
goto v_reusejp_1936_;
}
v_reusejp_1936_:
{
v_x_1863_ = v_n_1878_;
v_x_1864_ = v___x_1937_;
goto _start;
}
}
}
}
}
case 2:
{
lean_object* v___x_1949_; uint8_t v_isShared_1950_; uint8_t v_isSharedCheck_1978_; 
lean_inc(v_steps_1876_);
lean_inc(v_writes_1875_);
lean_inc(v_slots_1874_);
lean_inc(v_tape_1873_);
lean_inc(v_hist_1872_);
v_isSharedCheck_1978_ = !lean_is_exclusive(v_x_1864_);
if (v_isSharedCheck_1978_ == 0)
{
lean_object* v_unused_1979_; lean_object* v_unused_1980_; lean_object* v_unused_1981_; lean_object* v_unused_1982_; lean_object* v_unused_1983_; 
v_unused_1979_ = lean_ctor_get(v_x_1864_, 4);
lean_dec(v_unused_1979_);
v_unused_1980_ = lean_ctor_get(v_x_1864_, 3);
lean_dec(v_unused_1980_);
v_unused_1981_ = lean_ctor_get(v_x_1864_, 2);
lean_dec(v_unused_1981_);
v_unused_1982_ = lean_ctor_get(v_x_1864_, 1);
lean_dec(v_unused_1982_);
v_unused_1983_ = lean_ctor_get(v_x_1864_, 0);
lean_dec(v_unused_1983_);
v___x_1949_ = v_x_1864_;
v_isShared_1950_ = v_isSharedCheck_1978_;
goto v_resetjp_1948_;
}
else
{
lean_dec(v_x_1864_);
v___x_1949_ = lean_box(0);
v_isShared_1950_ = v_isSharedCheck_1978_;
goto v_resetjp_1948_;
}
v_resetjp_1948_:
{
lean_object* v_path_1951_; lean_object* v_name_1952_; lean_object* v_data_1953_; lean_object* v_hist_1955_; lean_object* v_tape_1956_; lean_object* v_slots_1957_; lean_object* v_writes_1958_; lean_object* v_steps_1959_; lean_object* v_settledWrites_1969_; lean_object* v___x_1970_; uint8_t v___x_1971_; 
v_path_1951_ = lean_ctor_get(v___x_1879_, 0);
lean_inc_ref_n(v_path_1951_, 2);
v_name_1952_ = lean_ctor_get(v___x_1879_, 1);
lean_inc_ref(v_name_1952_);
v_data_1953_ = lean_ctor_get(v___x_1879_, 2);
lean_inc(v_data_1953_);
lean_dec_ref_known(v___x_1879_, 3);
v_settledWrites_1969_ = lean_ctor_get(v_cfg_1860_, 2);
lean_inc_ref(v_settledWrites_1969_);
v___x_1970_ = lean_apply_1(v_settledWrites_1969_, v_path_1951_);
v___x_1971_ = lean_unbox(v___x_1970_);
if (v___x_1971_ == 0)
{
lean_object* v___x_1972_; lean_object* v___x_1973_; lean_object* v___x_1974_; lean_object* v___x_1975_; lean_object* v___x_1976_; lean_object* v___x_1977_; 
lean_inc(v_data_1953_);
v___x_1972_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1972_, 0, v_name_1952_);
lean_ctor_set(v___x_1972_, 1, v_data_1953_);
lean_inc_ref(v___x_1972_);
v___x_1973_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1973_, 0, v___x_1972_);
lean_ctor_set(v___x_1973_, 1, v_slots_1874_);
v___x_1974_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1974_, 0, v_path_1951_);
lean_ctor_set(v___x_1974_, 1, v___x_1972_);
v___x_1975_ = lean_box(0);
v___x_1976_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1976_, 0, v___x_1974_);
lean_ctor_set(v___x_1976_, 1, v___x_1975_);
v___x_1977_ = l_List_appendTR___redArg(v_writes_1875_, v___x_1976_);
v_hist_1955_ = v_hist_1872_;
v_tape_1956_ = v_tape_1873_;
v_slots_1957_ = v___x_1973_;
v_writes_1958_ = v___x_1977_;
v_steps_1959_ = v_steps_1876_;
goto v___jp_1954_;
}
else
{
lean_dec_ref(v_name_1952_);
lean_dec_ref(v_path_1951_);
v_hist_1955_ = v_hist_1872_;
v_tape_1956_ = v_tape_1873_;
v_slots_1957_ = v_slots_1874_;
v_writes_1958_ = v_writes_1875_;
v_steps_1959_ = v_steps_1876_;
goto v___jp_1954_;
}
v___jp_1954_:
{
lean_object* v___x_1960_; lean_object* v___x_1961_; lean_object* v___x_1962_; lean_object* v___x_1963_; lean_object* v___x_1964_; lean_object* v___x_1966_; 
v___x_1960_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1960_, 0, v_data_1953_);
v___x_1961_ = lean_box(0);
v___x_1962_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1962_, 0, v___x_1960_);
lean_ctor_set(v___x_1962_, 1, v___x_1961_);
v___x_1963_ = l_List_appendTR___redArg(v_hist_1955_, v___x_1962_);
v___x_1964_ = lean_nat_add(v_steps_1959_, v_one_1877_);
lean_dec(v_steps_1959_);
if (v_isShared_1950_ == 0)
{
lean_ctor_set(v___x_1949_, 4, v___x_1964_);
lean_ctor_set(v___x_1949_, 3, v_writes_1958_);
lean_ctor_set(v___x_1949_, 2, v_slots_1957_);
lean_ctor_set(v___x_1949_, 1, v_tape_1956_);
lean_ctor_set(v___x_1949_, 0, v___x_1963_);
v___x_1966_ = v___x_1949_;
goto v_reusejp_1965_;
}
else
{
lean_object* v_reuseFailAlloc_1968_; 
v_reuseFailAlloc_1968_ = lean_alloc_ctor(0, 5, 0);
lean_ctor_set(v_reuseFailAlloc_1968_, 0, v___x_1963_);
lean_ctor_set(v_reuseFailAlloc_1968_, 1, v_tape_1956_);
lean_ctor_set(v_reuseFailAlloc_1968_, 2, v_slots_1957_);
lean_ctor_set(v_reuseFailAlloc_1968_, 3, v_writes_1958_);
lean_ctor_set(v_reuseFailAlloc_1968_, 4, v___x_1964_);
v___x_1966_ = v_reuseFailAlloc_1968_;
goto v_reusejp_1965_;
}
v_reusejp_1965_:
{
v_x_1863_ = v_n_1878_;
v_x_1864_ = v___x_1966_;
goto _start;
}
}
}
}
default: 
{
uint8_t v_outcome_1984_; lean_object* v_failure_1985_; lean_object* v___x_1987_; uint8_t v_isShared_1988_; uint8_t v_isSharedCheck_1995_; 
lean_dec(v_n_1878_);
lean_dec(v_args_1862_);
lean_dec_ref(v_p_1861_);
lean_dec_ref(v_cfg_1860_);
v_outcome_1984_ = lean_ctor_get_uint8(v___x_1879_, sizeof(void*)*1);
v_failure_1985_ = lean_ctor_get(v___x_1879_, 0);
v_isSharedCheck_1995_ = !lean_is_exclusive(v___x_1879_);
if (v_isSharedCheck_1995_ == 0)
{
v___x_1987_ = v___x_1879_;
v_isShared_1988_ = v_isSharedCheck_1995_;
goto v_resetjp_1986_;
}
else
{
lean_inc(v_failure_1985_);
lean_dec(v___x_1879_);
v___x_1987_ = lean_box(0);
v_isShared_1988_ = v_isSharedCheck_1995_;
goto v_resetjp_1986_;
}
v_resetjp_1986_:
{
lean_object* v___x_1989_; lean_object* v___x_1991_; 
v___x_1989_ = lean_box(0);
if (v_isShared_1988_ == 0)
{
lean_ctor_set_tag(v___x_1987_, 0);
v___x_1991_ = v___x_1987_;
goto v_reusejp_1990_;
}
else
{
lean_object* v_reuseFailAlloc_1994_; 
v_reuseFailAlloc_1994_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v_reuseFailAlloc_1994_, 0, v_failure_1985_);
lean_ctor_set_uint8(v_reuseFailAlloc_1994_, sizeof(void*)*1, v_outcome_1984_);
v___x_1991_ = v_reuseFailAlloc_1994_;
goto v_reusejp_1990_;
}
v_reusejp_1990_:
{
lean_object* v___x_1992_; lean_object* v___x_1993_; 
v___x_1992_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1992_, 0, v_x_1864_);
lean_ctor_set(v___x_1992_, 1, v___x_1991_);
v___x_1993_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1993_, 0, v___x_1989_);
lean_ctor_set(v___x_1993_, 1, v___x_1992_);
return v___x_1993_;
}
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0(lean_object* v___x_1996_, lean_object* v_a_1997_, lean_object* v_b_1998_){
_start:
{
lean_object* v___x_1999_; uint8_t v___x_2000_; 
v___x_1999_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed), 2, 0);
v___x_2000_ = l_instDecidableEqProd___redArg(v___x_1996_, v___x_1999_, v_a_1997_, v_b_1998_);
return v___x_2000_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0___boxed(lean_object* v___x_2001_, lean_object* v_a_2002_, lean_object* v_b_2003_){
_start:
{
uint8_t v_res_2004_; lean_object* v_r_2005_; 
v_res_2004_ = lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0(v___x_2001_, v_a_2002_, v_b_2003_);
v_r_2005_ = lean_box(v_res_2004_);
return v_r_2005_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0(void){
_start:
{
lean_object* v___x_2006_; lean_object* v___f_2007_; 
v___x_2006_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___f_2007_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__0___boxed), 3, 1);
lean_closure_set(v___f_2007_, 0, v___x_2006_);
return v___f_2007_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1(lean_object* v_a_2008_, lean_object* v_b_2009_){
_start:
{
lean_object* v___x_2010_; lean_object* v___f_2011_; uint8_t v___x_2012_; 
v___x_2010_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___f_2011_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0, &lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0_once, _init_lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___closed__0);
v___x_2012_ = l_instDecidableEqProd___redArg(v___x_2010_, v___f_2011_, v_a_2008_, v_b_2009_);
return v___x_2012_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1___boxed(lean_object* v_a_2013_, lean_object* v_b_2014_){
_start:
{
uint8_t v_res_2015_; lean_object* v_r_2016_; 
v_res_2015_ = lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___lam__1(v_a_2013_, v_b_2014_);
v_r_2016_ = lean_box(v_res_2015_);
return v_r_2016_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq(lean_object* v_x_2018_, lean_object* v_x_2019_){
_start:
{
lean_object* v_produced_2020_; lean_object* v_hist_2021_; lean_object* v_writes_2022_; lean_object* v_end___2023_; lean_object* v_steps_2024_; lean_object* v_produced_2025_; lean_object* v_hist_2026_; lean_object* v_writes_2027_; lean_object* v_end___2028_; lean_object* v_steps_2029_; lean_object* v___x_2030_; uint8_t v___x_2031_; 
v_produced_2020_ = lean_ctor_get(v_x_2018_, 0);
lean_inc(v_produced_2020_);
v_hist_2021_ = lean_ctor_get(v_x_2018_, 1);
lean_inc(v_hist_2021_);
v_writes_2022_ = lean_ctor_get(v_x_2018_, 2);
lean_inc(v_writes_2022_);
v_end___2023_ = lean_ctor_get(v_x_2018_, 3);
lean_inc(v_end___2023_);
v_steps_2024_ = lean_ctor_get(v_x_2018_, 4);
lean_inc(v_steps_2024_);
lean_dec_ref(v_x_2018_);
v_produced_2025_ = lean_ctor_get(v_x_2019_, 0);
lean_inc(v_produced_2025_);
v_hist_2026_ = lean_ctor_get(v_x_2019_, 1);
lean_inc(v_hist_2026_);
v_writes_2027_ = lean_ctor_get(v_x_2019_, 2);
lean_inc(v_writes_2027_);
v_end___2028_ = lean_ctor_get(v_x_2019_, 3);
lean_inc(v_end___2028_);
v_steps_2029_ = lean_ctor_get(v_x_2019_, 4);
lean_inc(v_steps_2029_);
lean_dec_ref(v_x_2019_);
v___x_2030_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed), 2, 0);
v___x_2031_ = l_instDecidableEqList___redArg(v___x_2030_, v_produced_2020_, v_produced_2025_);
if (v___x_2031_ == 0)
{
lean_dec(v_steps_2029_);
lean_dec(v_end___2028_);
lean_dec(v_writes_2027_);
lean_dec(v_hist_2026_);
lean_dec(v_steps_2024_);
lean_dec(v_end___2023_);
lean_dec(v_writes_2022_);
lean_dec(v_hist_2021_);
return v___x_2031_;
}
else
{
lean_object* v___x_2032_; uint8_t v___x_2033_; 
v___x_2032_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqReply___boxed), 2, 0);
v___x_2033_ = l_instDecidableEqList___redArg(v___x_2032_, v_hist_2021_, v_hist_2026_);
if (v___x_2033_ == 0)
{
lean_dec(v_steps_2029_);
lean_dec(v_end___2028_);
lean_dec(v_writes_2027_);
lean_dec(v_steps_2024_);
lean_dec(v_end___2023_);
lean_dec(v_writes_2022_);
return v___x_2033_;
}
else
{
lean_object* v___f_2034_; uint8_t v___x_2035_; 
v___f_2034_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___closed__0));
v___x_2035_ = l_instDecidableEqList___redArg(v___f_2034_, v_writes_2022_, v_writes_2027_);
if (v___x_2035_ == 0)
{
lean_dec(v_steps_2029_);
lean_dec(v_end___2028_);
lean_dec(v_steps_2024_);
lean_dec(v_end___2023_);
return v___x_2035_;
}
else
{
uint8_t v___x_2036_; 
v___x_2036_ = lp_algalVerification_Algal_Replay_instDecidableEqEndMarker_decEq(v_end___2023_, v_end___2028_);
if (v___x_2036_ == 0)
{
lean_dec(v_steps_2029_);
lean_dec(v_steps_2024_);
return v___x_2036_;
}
else
{
uint8_t v___x_2037_; 
v___x_2037_ = lean_nat_dec_eq(v_steps_2024_, v_steps_2029_);
lean_dec(v_steps_2029_);
lean_dec(v_steps_2024_);
return v___x_2037_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq___boxed(lean_object* v_x_2038_, lean_object* v_x_2039_){
_start:
{
uint8_t v_res_2040_; lean_object* v_r_2041_; 
v_res_2040_ = lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq(v_x_2038_, v_x_2039_);
v_r_2041_ = lean_box(v_res_2040_);
return v_r_2041_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqRunResult(lean_object* v_x_2042_, lean_object* v_x_2043_){
_start:
{
uint8_t v___x_2044_; 
v___x_2044_ = lp_algalVerification_Algal_Replay_instDecidableEqRunResult_decEq(v_x_2042_, v_x_2043_);
return v___x_2044_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqRunResult___boxed(lean_object* v_x_2045_, lean_object* v_x_2046_){
_start:
{
uint8_t v_res_2047_; lean_object* v_r_2048_; 
v_res_2047_ = lp_algalVerification_Algal_Replay_instDecidableEqRunResult(v_x_2045_, v_x_2046_);
v_r_2048_ = lean_box(v_res_2047_);
return v_r_2048_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0(lean_object* v_d_2049_, lean_object* v_x_2050_){
_start:
{
if (lean_obj_tag(v_x_2050_) == 0)
{
uint8_t v___x_2051_; 
v___x_2051_ = 0;
return v___x_2051_;
}
else
{
lean_object* v_head_2052_; lean_object* v_tail_2053_; lean_object* v_fst_2054_; uint8_t v___x_2055_; 
v_head_2052_ = lean_ctor_get(v_x_2050_, 0);
v_tail_2053_ = lean_ctor_get(v_x_2050_, 1);
v_fst_2054_ = lean_ctor_get(v_head_2052_, 0);
v___x_2055_ = lean_string_dec_eq(v_fst_2054_, v_d_2049_);
if (v___x_2055_ == 0)
{
v_x_2050_ = v_tail_2053_;
goto _start;
}
else
{
return v___x_2055_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0___boxed(lean_object* v_d_2057_, lean_object* v_x_2058_){
_start:
{
uint8_t v_res_2059_; lean_object* v_r_2060_; 
v_res_2059_ = lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0(v_d_2057_, v_x_2058_);
lean_dec(v_x_2058_);
lean_dec_ref(v_d_2057_);
v_r_2060_ = lean_box(v_res_2059_);
return v_r_2060_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1(lean_object* v_cfg_2061_, lean_object* v_x_2062_){
_start:
{
if (lean_obj_tag(v_x_2062_) == 0)
{
uint8_t v___x_2063_; 
v___x_2063_ = 1;
return v___x_2063_;
}
else
{
lean_object* v_head_2064_; lean_object* v_tail_2065_; lean_object* v_cas_2066_; uint8_t v___x_2067_; 
v_head_2064_ = lean_ctor_get(v_x_2062_, 0);
v_tail_2065_ = lean_ctor_get(v_x_2062_, 1);
v_cas_2066_ = lean_ctor_get(v_cfg_2061_, 3);
v___x_2067_ = lp_algalVerification_List_any___at___00Algal_Replay_closureSatisfied_spec__0(v_head_2064_, v_cas_2066_);
if (v___x_2067_ == 0)
{
return v___x_2067_;
}
else
{
v_x_2062_ = v_tail_2065_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1___boxed(lean_object* v_cfg_2069_, lean_object* v_x_2070_){
_start:
{
uint8_t v_res_2071_; lean_object* v_r_2072_; 
v_res_2071_ = lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1(v_cfg_2069_, v_x_2070_);
lean_dec(v_x_2070_);
lean_dec_ref(v_cfg_2069_);
v_r_2072_ = lean_box(v_res_2071_);
return v_r_2072_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_closureSatisfied(lean_object* v_cfg_2073_, lean_object* v_p_2074_){
_start:
{
lean_object* v_closure_2075_; uint8_t v___x_2076_; 
v_closure_2075_ = lean_ctor_get(v_p_2074_, 2);
v___x_2076_ = lp_algalVerification_List_all___at___00Algal_Replay_closureSatisfied_spec__1(v_cfg_2073_, v_closure_2075_);
return v___x_2076_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_closureSatisfied___boxed(lean_object* v_cfg_2077_, lean_object* v_p_2078_){
_start:
{
uint8_t v_res_2079_; lean_object* v_r_2080_; 
v_res_2079_ = lp_algalVerification_Algal_Replay_closureSatisfied(v_cfg_2077_, v_p_2078_);
lean_dec_ref(v_p_2078_);
lean_dec_ref(v_cfg_2077_);
v_r_2080_ = lean_box(v_res_2079_);
return v_r_2080_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_run(lean_object* v_cfg_2084_, lean_object* v_p_2085_, lean_object* v_args_2086_, lean_object* v_tape_2087_, lean_object* v_init_2088_){
_start:
{
uint8_t v___x_2089_; 
v___x_2089_ = lp_algalVerification_Algal_Replay_closureSatisfied(v_cfg_2084_, v_p_2085_);
if (v___x_2089_ == 0)
{
lean_object* v___x_2090_; 
lean_dec(v_init_2088_);
lean_dec(v_tape_2087_);
lean_dec(v_args_2086_);
lean_dec_ref(v_p_2085_);
lean_dec_ref(v_cfg_2084_);
v___x_2090_ = ((lean_object*)(lp_algalVerification_Algal_Replay_run___closed__0));
return v___x_2090_;
}
else
{
lean_object* v_maxCalls_2091_; lean_object* v___x_2092_; lean_object* v___x_2093_; lean_object* v___x_2094_; lean_object* v___x_2095_; lean_object* v_snd_2096_; lean_object* v_fst_2097_; lean_object* v_fst_2098_; lean_object* v_snd_2099_; lean_object* v_hist_2100_; lean_object* v_writes_2101_; lean_object* v_steps_2102_; lean_object* v___x_2104_; uint8_t v_isShared_2105_; uint8_t v_isSharedCheck_2110_; 
v_maxCalls_2091_ = lean_ctor_get(v_p_2085_, 3);
lean_inc(v_maxCalls_2091_);
v___x_2092_ = lean_box(0);
v___x_2093_ = lean_unsigned_to_nat(0u);
v___x_2094_ = lean_alloc_ctor(0, 5, 0);
lean_ctor_set(v___x_2094_, 0, v___x_2092_);
lean_ctor_set(v___x_2094_, 1, v_tape_2087_);
lean_ctor_set(v___x_2094_, 2, v_init_2088_);
lean_ctor_set(v___x_2094_, 3, v___x_2092_);
lean_ctor_set(v___x_2094_, 4, v___x_2093_);
v___x_2095_ = lp_algalVerification_Algal_Replay_steps(v_cfg_2084_, v_p_2085_, v_args_2086_, v_maxCalls_2091_, v___x_2094_);
v_snd_2096_ = lean_ctor_get(v___x_2095_, 1);
lean_inc(v_snd_2096_);
v_fst_2097_ = lean_ctor_get(v_snd_2096_, 0);
lean_inc(v_fst_2097_);
v_fst_2098_ = lean_ctor_get(v___x_2095_, 0);
lean_inc(v_fst_2098_);
lean_dec_ref(v___x_2095_);
v_snd_2099_ = lean_ctor_get(v_snd_2096_, 1);
lean_inc(v_snd_2099_);
lean_dec(v_snd_2096_);
v_hist_2100_ = lean_ctor_get(v_fst_2097_, 0);
v_writes_2101_ = lean_ctor_get(v_fst_2097_, 3);
v_steps_2102_ = lean_ctor_get(v_fst_2097_, 4);
v_isSharedCheck_2110_ = !lean_is_exclusive(v_fst_2097_);
if (v_isSharedCheck_2110_ == 0)
{
lean_object* v_unused_2111_; lean_object* v_unused_2112_; 
v_unused_2111_ = lean_ctor_get(v_fst_2097_, 2);
lean_dec(v_unused_2111_);
v_unused_2112_ = lean_ctor_get(v_fst_2097_, 1);
lean_dec(v_unused_2112_);
v___x_2104_ = v_fst_2097_;
v_isShared_2105_ = v_isSharedCheck_2110_;
goto v_resetjp_2103_;
}
else
{
lean_inc(v_steps_2102_);
lean_inc(v_writes_2101_);
lean_inc(v_hist_2100_);
lean_dec(v_fst_2097_);
v___x_2104_ = lean_box(0);
v_isShared_2105_ = v_isSharedCheck_2110_;
goto v_resetjp_2103_;
}
v_resetjp_2103_:
{
lean_object* v___x_2107_; 
if (v_isShared_2105_ == 0)
{
lean_ctor_set(v___x_2104_, 3, v_snd_2099_);
lean_ctor_set(v___x_2104_, 2, v_writes_2101_);
lean_ctor_set(v___x_2104_, 1, v_hist_2100_);
lean_ctor_set(v___x_2104_, 0, v_fst_2098_);
v___x_2107_ = v___x_2104_;
goto v_reusejp_2106_;
}
else
{
lean_object* v_reuseFailAlloc_2109_; 
v_reuseFailAlloc_2109_ = lean_alloc_ctor(0, 5, 0);
lean_ctor_set(v_reuseFailAlloc_2109_, 0, v_fst_2098_);
lean_ctor_set(v_reuseFailAlloc_2109_, 1, v_hist_2100_);
lean_ctor_set(v_reuseFailAlloc_2109_, 2, v_writes_2101_);
lean_ctor_set(v_reuseFailAlloc_2109_, 3, v_snd_2099_);
lean_ctor_set(v_reuseFailAlloc_2109_, 4, v_steps_2102_);
v___x_2107_ = v_reuseFailAlloc_2109_;
goto v_reusejp_2106_;
}
v_reusejp_2106_:
{
lean_object* v___x_2108_; 
v___x_2108_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2108_, 0, v___x_2107_);
return v___x_2108_;
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_outcomeOf(lean_object* v_x_2113_){
_start:
{
switch(lean_obj_tag(v_x_2113_))
{
case 0:
{
uint8_t v_outcome_2114_; 
v_outcome_2114_ = lean_ctor_get_uint8(v_x_2113_, sizeof(void*)*1);
return v_outcome_2114_;
}
case 1:
{
uint8_t v___x_2115_; 
v___x_2115_ = 3;
return v___x_2115_;
}
default: 
{
uint8_t v___x_2116_; 
v___x_2116_ = 1;
return v___x_2116_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_outcomeOf___boxed(lean_object* v_x_2117_){
_start:
{
uint8_t v_res_2118_; lean_object* v_r_2119_; 
v_res_2118_ = lp_algalVerification_Algal_Replay_outcomeOf(v_x_2117_);
lean_dec(v_x_2117_);
v_r_2119_ = lean_box(v_res_2118_);
return v_r_2119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_failureOf(lean_object* v_x_2123_){
_start:
{
switch(lean_obj_tag(v_x_2123_))
{
case 0:
{
lean_object* v_failure_2124_; 
v_failure_2124_ = lean_ctor_get(v_x_2123_, 0);
lean_inc(v_failure_2124_);
return v_failure_2124_;
}
case 1:
{
lean_object* v___x_2125_; 
v___x_2125_ = lean_box(0);
return v___x_2125_;
}
default: 
{
lean_object* v___x_2126_; 
v___x_2126_ = ((lean_object*)(lp_algalVerification_Algal_Replay_failureOf___closed__0));
return v___x_2126_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_failureOf___boxed(lean_object* v_x_2127_){
_start:
{
lean_object* v_res_2128_; 
v_res_2128_ = lp_algalVerification_Algal_Replay_failureOf(v_x_2127_);
lean_dec(v_x_2127_);
return v_res_2128_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(lean_object* v_x_2129_, lean_object* v_x_2130_){
_start:
{
lean_object* v_name_2131_; lean_object* v_version_2132_; lean_object* v_name_2133_; lean_object* v_version_2134_; uint8_t v___x_2135_; 
v_name_2131_ = lean_ctor_get(v_x_2129_, 0);
v_version_2132_ = lean_ctor_get(v_x_2129_, 1);
v_name_2133_ = lean_ctor_get(v_x_2130_, 0);
v_version_2134_ = lean_ctor_get(v_x_2130_, 1);
v___x_2135_ = lean_string_dec_eq(v_name_2131_, v_name_2133_);
if (v___x_2135_ == 0)
{
return v___x_2135_;
}
else
{
uint8_t v___x_2136_; 
v___x_2136_ = lean_string_dec_eq(v_version_2132_, v_version_2134_);
return v___x_2136_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq___boxed(lean_object* v_x_2137_, lean_object* v_x_2138_){
_start:
{
uint8_t v_res_2139_; lean_object* v_r_2140_; 
v_res_2139_ = lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(v_x_2137_, v_x_2138_);
lean_dec_ref(v_x_2138_);
lean_dec_ref(v_x_2137_);
v_r_2140_ = lean_box(v_res_2139_);
return v_r_2140_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqStamp(lean_object* v_x_2141_, lean_object* v_x_2142_){
_start:
{
uint8_t v___x_2143_; 
v___x_2143_ = lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(v_x_2141_, v_x_2142_);
return v___x_2143_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqStamp___boxed(lean_object* v_x_2144_, lean_object* v_x_2145_){
_start:
{
uint8_t v_res_2146_; lean_object* v_r_2147_; 
v_res_2146_ = lp_algalVerification_Algal_Replay_instDecidableEqStamp(v_x_2144_, v_x_2145_);
lean_dec_ref(v_x_2145_);
lean_dec_ref(v_x_2144_);
v_r_2147_ = lean_box(v_res_2146_);
return v_r_2147_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7(void){
_start:
{
lean_object* v___x_2161_; lean_object* v___x_2162_; 
v___x_2161_ = lean_unsigned_to_nat(8u);
v___x_2162_ = lean_nat_to_int(v___x_2161_);
return v___x_2162_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12(void){
_start:
{
lean_object* v___x_2169_; lean_object* v___x_2170_; 
v___x_2169_ = lean_unsigned_to_nat(11u);
v___x_2170_ = lean_nat_to_int(v___x_2169_);
return v___x_2170_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14(void){
_start:
{
lean_object* v___x_2172_; lean_object* v___x_2173_; 
v___x_2172_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__0));
v___x_2173_ = lean_string_length(v___x_2172_);
return v___x_2173_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15(void){
_start:
{
lean_object* v___x_2174_; lean_object* v___x_2175_; 
v___x_2174_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14, &lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14_once, _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__14);
v___x_2175_ = lean_nat_to_int(v___x_2174_);
return v___x_2175_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg(lean_object* v_x_2180_){
_start:
{
lean_object* v_name_2181_; lean_object* v_version_2182_; lean_object* v___x_2184_; uint8_t v_isShared_2185_; uint8_t v_isSharedCheck_2217_; 
v_name_2181_ = lean_ctor_get(v_x_2180_, 0);
v_version_2182_ = lean_ctor_get(v_x_2180_, 1);
v_isSharedCheck_2217_ = !lean_is_exclusive(v_x_2180_);
if (v_isSharedCheck_2217_ == 0)
{
v___x_2184_ = v_x_2180_;
v_isShared_2185_ = v_isSharedCheck_2217_;
goto v_resetjp_2183_;
}
else
{
lean_inc(v_version_2182_);
lean_inc(v_name_2181_);
lean_dec(v_x_2180_);
v___x_2184_ = lean_box(0);
v_isShared_2185_ = v_isSharedCheck_2217_;
goto v_resetjp_2183_;
}
v_resetjp_2183_:
{
lean_object* v___x_2186_; lean_object* v___x_2187_; lean_object* v___x_2188_; lean_object* v___x_2189_; lean_object* v___x_2190_; lean_object* v___x_2192_; 
v___x_2186_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5));
v___x_2187_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__6));
v___x_2188_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7, &lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__7);
v___x_2189_ = l_String_quote(v_name_2181_);
v___x_2190_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_2190_, 0, v___x_2189_);
if (v_isShared_2185_ == 0)
{
lean_ctor_set_tag(v___x_2184_, 4);
lean_ctor_set(v___x_2184_, 1, v___x_2190_);
lean_ctor_set(v___x_2184_, 0, v___x_2188_);
v___x_2192_ = v___x_2184_;
goto v_reusejp_2191_;
}
else
{
lean_object* v_reuseFailAlloc_2216_; 
v_reuseFailAlloc_2216_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2216_, 0, v___x_2188_);
lean_ctor_set(v_reuseFailAlloc_2216_, 1, v___x_2190_);
v___x_2192_ = v_reuseFailAlloc_2216_;
goto v_reusejp_2191_;
}
v_reusejp_2191_:
{
uint8_t v___x_2193_; lean_object* v___x_2194_; lean_object* v___x_2195_; lean_object* v___x_2196_; lean_object* v___x_2197_; lean_object* v___x_2198_; lean_object* v___x_2199_; lean_object* v___x_2200_; lean_object* v___x_2201_; lean_object* v___x_2202_; lean_object* v___x_2203_; lean_object* v___x_2204_; lean_object* v___x_2205_; lean_object* v___x_2206_; lean_object* v___x_2207_; lean_object* v___x_2208_; lean_object* v___x_2209_; lean_object* v___x_2210_; lean_object* v___x_2211_; lean_object* v___x_2212_; lean_object* v___x_2213_; lean_object* v___x_2214_; lean_object* v___x_2215_; 
v___x_2193_ = 0;
v___x_2194_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2194_, 0, v___x_2192_);
lean_ctor_set_uint8(v___x_2194_, sizeof(void*)*1, v___x_2193_);
v___x_2195_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2195_, 0, v___x_2187_);
lean_ctor_set(v___x_2195_, 1, v___x_2194_);
v___x_2196_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9));
v___x_2197_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2197_, 0, v___x_2195_);
lean_ctor_set(v___x_2197_, 1, v___x_2196_);
v___x_2198_ = lean_box(1);
v___x_2199_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2199_, 0, v___x_2197_);
lean_ctor_set(v___x_2199_, 1, v___x_2198_);
v___x_2200_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__11));
v___x_2201_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2201_, 0, v___x_2199_);
lean_ctor_set(v___x_2201_, 1, v___x_2200_);
v___x_2202_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2202_, 0, v___x_2201_);
lean_ctor_set(v___x_2202_, 1, v___x_2186_);
v___x_2203_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12, &lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__12);
v___x_2204_ = l_String_quote(v_version_2182_);
v___x_2205_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_2205_, 0, v___x_2204_);
v___x_2206_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2206_, 0, v___x_2203_);
lean_ctor_set(v___x_2206_, 1, v___x_2205_);
v___x_2207_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2207_, 0, v___x_2206_);
lean_ctor_set_uint8(v___x_2207_, sizeof(void*)*1, v___x_2193_);
v___x_2208_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2208_, 0, v___x_2202_);
lean_ctor_set(v___x_2208_, 1, v___x_2207_);
v___x_2209_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15, &lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15_once, _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15);
v___x_2210_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__16));
v___x_2211_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2211_, 0, v___x_2210_);
lean_ctor_set(v___x_2211_, 1, v___x_2208_);
v___x_2212_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__17));
v___x_2213_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2213_, 0, v___x_2211_);
lean_ctor_set(v___x_2213_, 1, v___x_2212_);
v___x_2214_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2214_, 0, v___x_2209_);
lean_ctor_set(v___x_2214_, 1, v___x_2213_);
v___x_2215_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2215_, 0, v___x_2214_);
lean_ctor_set_uint8(v___x_2215_, sizeof(void*)*1, v___x_2193_);
return v___x_2215_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr(lean_object* v_x_2218_, lean_object* v_prec_2219_){
_start:
{
lean_object* v___x_2220_; 
v___x_2220_ = lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg(v_x_2218_);
return v___x_2220_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprStamp_repr___boxed(lean_object* v_x_2221_, lean_object* v_prec_2222_){
_start:
{
lean_object* v_res_2223_; 
v_res_2223_ = lp_algalVerification_Algal_Replay_instReprStamp_repr(v_x_2221_, v_prec_2222_);
lean_dec(v_prec_2222_);
return v_res_2223_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqStamp_beq(lean_object* v_x_2226_, lean_object* v_x_2227_){
_start:
{
lean_object* v_name_2228_; lean_object* v_version_2229_; lean_object* v_name_2230_; lean_object* v_version_2231_; uint8_t v___x_2232_; 
v_name_2228_ = lean_ctor_get(v_x_2226_, 0);
v_version_2229_ = lean_ctor_get(v_x_2226_, 1);
v_name_2230_ = lean_ctor_get(v_x_2227_, 0);
v_version_2231_ = lean_ctor_get(v_x_2227_, 1);
v___x_2232_ = lean_string_dec_eq(v_name_2228_, v_name_2230_);
if (v___x_2232_ == 0)
{
return v___x_2232_;
}
else
{
uint8_t v___x_2233_; 
v___x_2233_ = lean_string_dec_eq(v_version_2229_, v_version_2231_);
return v___x_2233_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqStamp_beq___boxed(lean_object* v_x_2234_, lean_object* v_x_2235_){
_start:
{
uint8_t v_res_2236_; lean_object* v_r_2237_; 
v_res_2236_ = lp_algalVerification_Algal_Replay_instBEqStamp_beq(v_x_2234_, v_x_2235_);
lean_dec_ref(v_x_2235_);
lean_dec_ref(v_x_2234_);
v_r_2237_ = lean_box(v_res_2236_);
return v_r_2237_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(lean_object* v_x_2240_, lean_object* v_x_2241_){
_start:
{
lean_object* v_steps_2242_; lean_object* v_agentCalls_2243_; lean_object* v_units_2244_; lean_object* v_steps_2245_; lean_object* v_agentCalls_2246_; lean_object* v_units_2247_; uint8_t v___x_2248_; 
v_steps_2242_ = lean_ctor_get(v_x_2240_, 0);
v_agentCalls_2243_ = lean_ctor_get(v_x_2240_, 1);
v_units_2244_ = lean_ctor_get(v_x_2240_, 2);
v_steps_2245_ = lean_ctor_get(v_x_2241_, 0);
v_agentCalls_2246_ = lean_ctor_get(v_x_2241_, 1);
v_units_2247_ = lean_ctor_get(v_x_2241_, 2);
v___x_2248_ = lean_nat_dec_eq(v_steps_2242_, v_steps_2245_);
if (v___x_2248_ == 0)
{
return v___x_2248_;
}
else
{
uint8_t v___x_2249_; 
v___x_2249_ = lean_nat_dec_eq(v_agentCalls_2243_, v_agentCalls_2246_);
if (v___x_2249_ == 0)
{
return v___x_2249_;
}
else
{
uint8_t v___x_2250_; 
v___x_2250_ = lean_nat_dec_eq(v_units_2244_, v_units_2247_);
return v___x_2250_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq___boxed(lean_object* v_x_2251_, lean_object* v_x_2252_){
_start:
{
uint8_t v_res_2253_; lean_object* v_r_2254_; 
v_res_2253_ = lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(v_x_2251_, v_x_2252_);
lean_dec_ref(v_x_2252_);
lean_dec_ref(v_x_2251_);
v_r_2254_ = lean_box(v_res_2253_);
return v_r_2254_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqWork(lean_object* v_x_2255_, lean_object* v_x_2256_){
_start:
{
uint8_t v___x_2257_; 
v___x_2257_ = lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(v_x_2255_, v_x_2256_);
return v___x_2257_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqWork___boxed(lean_object* v_x_2258_, lean_object* v_x_2259_){
_start:
{
uint8_t v_res_2260_; lean_object* v_r_2261_; 
v_res_2260_ = lp_algalVerification_Algal_Replay_instDecidableEqWork(v_x_2258_, v_x_2259_);
lean_dec_ref(v_x_2259_);
lean_dec_ref(v_x_2258_);
v_r_2261_ = lean_box(v_res_2260_);
return v_r_2261_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4(void){
_start:
{
lean_object* v___x_2271_; lean_object* v___x_2272_; 
v___x_2271_ = lean_unsigned_to_nat(9u);
v___x_2272_ = lean_nat_to_int(v___x_2271_);
return v___x_2272_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7(void){
_start:
{
lean_object* v___x_2276_; lean_object* v___x_2277_; 
v___x_2276_ = lean_unsigned_to_nat(14u);
v___x_2277_ = lean_nat_to_int(v___x_2276_);
return v___x_2277_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___redArg(lean_object* v_x_2281_){
_start:
{
lean_object* v_steps_2282_; lean_object* v_agentCalls_2283_; lean_object* v_units_2284_; lean_object* v___x_2285_; lean_object* v___x_2286_; lean_object* v___x_2287_; lean_object* v___x_2288_; lean_object* v___x_2289_; lean_object* v___x_2290_; uint8_t v___x_2291_; lean_object* v___x_2292_; lean_object* v___x_2293_; lean_object* v___x_2294_; lean_object* v___x_2295_; lean_object* v___x_2296_; lean_object* v___x_2297_; lean_object* v___x_2298_; lean_object* v___x_2299_; lean_object* v___x_2300_; lean_object* v___x_2301_; lean_object* v___x_2302_; lean_object* v___x_2303_; lean_object* v___x_2304_; lean_object* v___x_2305_; lean_object* v___x_2306_; lean_object* v___x_2307_; lean_object* v___x_2308_; lean_object* v___x_2309_; lean_object* v___x_2310_; lean_object* v___x_2311_; lean_object* v___x_2312_; lean_object* v___x_2313_; lean_object* v___x_2314_; lean_object* v___x_2315_; lean_object* v___x_2316_; lean_object* v___x_2317_; lean_object* v___x_2318_; lean_object* v___x_2319_; lean_object* v___x_2320_; lean_object* v___x_2321_; lean_object* v___x_2322_; lean_object* v___x_2323_; 
v_steps_2282_ = lean_ctor_get(v_x_2281_, 0);
lean_inc(v_steps_2282_);
v_agentCalls_2283_ = lean_ctor_get(v_x_2281_, 1);
lean_inc(v_agentCalls_2283_);
v_units_2284_ = lean_ctor_get(v_x_2281_, 2);
lean_inc(v_units_2284_);
lean_dec_ref(v_x_2281_);
v___x_2285_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__5));
v___x_2286_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__3));
v___x_2287_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4, &lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4_once, _init_lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__4);
v___x_2288_ = l_Nat_reprFast(v_steps_2282_);
v___x_2289_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_2289_, 0, v___x_2288_);
v___x_2290_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2290_, 0, v___x_2287_);
lean_ctor_set(v___x_2290_, 1, v___x_2289_);
v___x_2291_ = 0;
v___x_2292_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2292_, 0, v___x_2290_);
lean_ctor_set_uint8(v___x_2292_, sizeof(void*)*1, v___x_2291_);
v___x_2293_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2293_, 0, v___x_2286_);
lean_ctor_set(v___x_2293_, 1, v___x_2292_);
v___x_2294_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__9));
v___x_2295_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2295_, 0, v___x_2293_);
lean_ctor_set(v___x_2295_, 1, v___x_2294_);
v___x_2296_ = lean_box(1);
v___x_2297_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2297_, 0, v___x_2295_);
lean_ctor_set(v___x_2297_, 1, v___x_2296_);
v___x_2298_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__6));
v___x_2299_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2299_, 0, v___x_2297_);
lean_ctor_set(v___x_2299_, 1, v___x_2298_);
v___x_2300_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2300_, 0, v___x_2299_);
lean_ctor_set(v___x_2300_, 1, v___x_2285_);
v___x_2301_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7, &lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__7);
v___x_2302_ = l_Nat_reprFast(v_agentCalls_2283_);
v___x_2303_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_2303_, 0, v___x_2302_);
v___x_2304_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2304_, 0, v___x_2301_);
lean_ctor_set(v___x_2304_, 1, v___x_2303_);
v___x_2305_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2305_, 0, v___x_2304_);
lean_ctor_set_uint8(v___x_2305_, sizeof(void*)*1, v___x_2291_);
v___x_2306_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2306_, 0, v___x_2300_);
lean_ctor_set(v___x_2306_, 1, v___x_2305_);
v___x_2307_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2307_, 0, v___x_2306_);
lean_ctor_set(v___x_2307_, 1, v___x_2294_);
v___x_2308_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2308_, 0, v___x_2307_);
lean_ctor_set(v___x_2308_, 1, v___x_2296_);
v___x_2309_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprWork_repr___redArg___closed__9));
v___x_2310_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2310_, 0, v___x_2308_);
lean_ctor_set(v___x_2310_, 1, v___x_2309_);
v___x_2311_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2311_, 0, v___x_2310_);
lean_ctor_set(v___x_2311_, 1, v___x_2285_);
v___x_2312_ = l_Nat_reprFast(v_units_2284_);
v___x_2313_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_2313_, 0, v___x_2312_);
v___x_2314_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2314_, 0, v___x_2287_);
lean_ctor_set(v___x_2314_, 1, v___x_2313_);
v___x_2315_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2315_, 0, v___x_2314_);
lean_ctor_set_uint8(v___x_2315_, sizeof(void*)*1, v___x_2291_);
v___x_2316_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2316_, 0, v___x_2311_);
lean_ctor_set(v___x_2316_, 1, v___x_2315_);
v___x_2317_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15, &lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15_once, _init_lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__15);
v___x_2318_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__16));
v___x_2319_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2319_, 0, v___x_2318_);
lean_ctor_set(v___x_2319_, 1, v___x_2316_);
v___x_2320_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprStamp_repr___redArg___closed__17));
v___x_2321_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_2321_, 0, v___x_2319_);
lean_ctor_set(v___x_2321_, 1, v___x_2320_);
v___x_2322_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2322_, 0, v___x_2317_);
lean_ctor_set(v___x_2322_, 1, v___x_2321_);
v___x_2323_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2323_, 0, v___x_2322_);
lean_ctor_set_uint8(v___x_2323_, sizeof(void*)*1, v___x_2291_);
return v___x_2323_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr(lean_object* v_x_2324_, lean_object* v_prec_2325_){
_start:
{
lean_object* v___x_2326_; 
v___x_2326_ = lp_algalVerification_Algal_Replay_instReprWork_repr___redArg(v_x_2324_);
return v___x_2326_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprWork_repr___boxed(lean_object* v_x_2327_, lean_object* v_prec_2328_){
_start:
{
lean_object* v_res_2329_; 
v_res_2329_ = lp_algalVerification_Algal_Replay_instReprWork_repr(v_x_2327_, v_prec_2328_);
lean_dec(v_prec_2328_);
return v_res_2329_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqWork_beq(lean_object* v_x_2332_, lean_object* v_x_2333_){
_start:
{
lean_object* v_steps_2334_; lean_object* v_agentCalls_2335_; lean_object* v_units_2336_; lean_object* v_steps_2337_; lean_object* v_agentCalls_2338_; lean_object* v_units_2339_; uint8_t v___x_2340_; 
v_steps_2334_ = lean_ctor_get(v_x_2332_, 0);
v_agentCalls_2335_ = lean_ctor_get(v_x_2332_, 1);
v_units_2336_ = lean_ctor_get(v_x_2332_, 2);
v_steps_2337_ = lean_ctor_get(v_x_2333_, 0);
v_agentCalls_2338_ = lean_ctor_get(v_x_2333_, 1);
v_units_2339_ = lean_ctor_get(v_x_2333_, 2);
v___x_2340_ = lean_nat_dec_eq(v_steps_2334_, v_steps_2337_);
if (v___x_2340_ == 0)
{
return v___x_2340_;
}
else
{
uint8_t v___x_2341_; 
v___x_2341_ = lean_nat_dec_eq(v_agentCalls_2335_, v_agentCalls_2338_);
if (v___x_2341_ == 0)
{
return v___x_2341_;
}
else
{
uint8_t v___x_2342_; 
v___x_2342_ = lean_nat_dec_eq(v_units_2336_, v_units_2339_);
return v___x_2342_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqWork_beq___boxed(lean_object* v_x_2343_, lean_object* v_x_2344_){
_start:
{
uint8_t v_res_2345_; lean_object* v_r_2346_; 
v_res_2345_ = lp_algalVerification_Algal_Replay_instBEqWork_beq(v_x_2343_, v_x_2344_);
lean_dec_ref(v_x_2344_);
lean_dec_ref(v_x_2343_);
v_r_2346_ = lean_box(v_res_2345_);
return v_r_2346_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorIdx(uint8_t v_x_2349_){
_start:
{
switch(v_x_2349_)
{
case 0:
{
lean_object* v___x_2350_; 
v___x_2350_ = lean_unsigned_to_nat(0u);
return v___x_2350_;
}
case 1:
{
lean_object* v___x_2351_; 
v___x_2351_ = lean_unsigned_to_nat(1u);
return v___x_2351_;
}
default: 
{
lean_object* v___x_2352_; 
v___x_2352_ = lean_unsigned_to_nat(2u);
return v___x_2352_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorIdx___boxed(lean_object* v_x_2353_){
_start:
{
uint8_t v_x_boxed_2354_; lean_object* v_res_2355_; 
v_x_boxed_2354_ = lean_unbox(v_x_2353_);
v_res_2355_ = lp_algalVerification_Algal_Replay_EventKind_ctorIdx(v_x_boxed_2354_);
return v_res_2355_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___redArg(lean_object* v_k_2356_){
_start:
{
lean_inc(v_k_2356_);
return v_k_2356_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___redArg___boxed(lean_object* v_k_2357_){
_start:
{
lean_object* v_res_2358_; 
v_res_2358_ = lp_algalVerification_Algal_Replay_EventKind_ctorElim___redArg(v_k_2357_);
lean_dec(v_k_2357_);
return v_res_2358_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim(lean_object* v_motive_2359_, lean_object* v_ctorIdx_2360_, uint8_t v_t_2361_, lean_object* v_h_2362_, lean_object* v_k_2363_){
_start:
{
lean_inc(v_k_2363_);
return v_k_2363_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ctorElim___boxed(lean_object* v_motive_2364_, lean_object* v_ctorIdx_2365_, lean_object* v_t_2366_, lean_object* v_h_2367_, lean_object* v_k_2368_){
_start:
{
uint8_t v_t_boxed_2369_; lean_object* v_res_2370_; 
v_t_boxed_2369_ = lean_unbox(v_t_2366_);
v_res_2370_ = lp_algalVerification_Algal_Replay_EventKind_ctorElim(v_motive_2364_, v_ctorIdx_2365_, v_t_boxed_2369_, v_h_2367_, v_k_2368_);
lean_dec(v_k_2368_);
lean_dec(v_ctorIdx_2365_);
return v_res_2370_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___redArg(lean_object* v_runStart_2371_){
_start:
{
lean_inc(v_runStart_2371_);
return v_runStart_2371_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___redArg___boxed(lean_object* v_runStart_2372_){
_start:
{
lean_object* v_res_2373_; 
v_res_2373_ = lp_algalVerification_Algal_Replay_EventKind_runStart_elim___redArg(v_runStart_2372_);
lean_dec(v_runStart_2372_);
return v_res_2373_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim(lean_object* v_motive_2374_, uint8_t v_t_2375_, lean_object* v_h_2376_, lean_object* v_runStart_2377_){
_start:
{
lean_inc(v_runStart_2377_);
return v_runStart_2377_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runStart_elim___boxed(lean_object* v_motive_2378_, lean_object* v_t_2379_, lean_object* v_h_2380_, lean_object* v_runStart_2381_){
_start:
{
uint8_t v_t_boxed_2382_; lean_object* v_res_2383_; 
v_t_boxed_2382_ = lean_unbox(v_t_2379_);
v_res_2383_ = lp_algalVerification_Algal_Replay_EventKind_runStart_elim(v_motive_2378_, v_t_boxed_2382_, v_h_2380_, v_runStart_2381_);
lean_dec(v_runStart_2381_);
return v_res_2383_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___redArg(lean_object* v_effect_2384_){
_start:
{
lean_inc(v_effect_2384_);
return v_effect_2384_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___redArg___boxed(lean_object* v_effect_2385_){
_start:
{
lean_object* v_res_2386_; 
v_res_2386_ = lp_algalVerification_Algal_Replay_EventKind_effect_elim___redArg(v_effect_2385_);
lean_dec(v_effect_2385_);
return v_res_2386_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim(lean_object* v_motive_2387_, uint8_t v_t_2388_, lean_object* v_h_2389_, lean_object* v_effect_2390_){
_start:
{
lean_inc(v_effect_2390_);
return v_effect_2390_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_effect_elim___boxed(lean_object* v_motive_2391_, lean_object* v_t_2392_, lean_object* v_h_2393_, lean_object* v_effect_2394_){
_start:
{
uint8_t v_t_boxed_2395_; lean_object* v_res_2396_; 
v_t_boxed_2395_ = lean_unbox(v_t_2392_);
v_res_2396_ = lp_algalVerification_Algal_Replay_EventKind_effect_elim(v_motive_2391_, v_t_boxed_2395_, v_h_2393_, v_effect_2394_);
lean_dec(v_effect_2394_);
return v_res_2396_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___redArg(lean_object* v_runEnd_2397_){
_start:
{
lean_inc(v_runEnd_2397_);
return v_runEnd_2397_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___redArg___boxed(lean_object* v_runEnd_2398_){
_start:
{
lean_object* v_res_2399_; 
v_res_2399_ = lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___redArg(v_runEnd_2398_);
lean_dec(v_runEnd_2398_);
return v_res_2399_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim(lean_object* v_motive_2400_, uint8_t v_t_2401_, lean_object* v_h_2402_, lean_object* v_runEnd_2403_){
_start:
{
lean_inc(v_runEnd_2403_);
return v_runEnd_2403_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_runEnd_elim___boxed(lean_object* v_motive_2404_, lean_object* v_t_2405_, lean_object* v_h_2406_, lean_object* v_runEnd_2407_){
_start:
{
uint8_t v_t_boxed_2408_; lean_object* v_res_2409_; 
v_t_boxed_2408_ = lean_unbox(v_t_2405_);
v_res_2409_ = lp_algalVerification_Algal_Replay_EventKind_runEnd_elim(v_motive_2404_, v_t_boxed_2408_, v_h_2406_, v_runEnd_2407_);
lean_dec(v_runEnd_2407_);
return v_res_2409_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_EventKind_ofNat(lean_object* v_n_2410_){
_start:
{
lean_object* v___x_2411_; uint8_t v___x_2412_; 
v___x_2411_ = lean_unsigned_to_nat(0u);
v___x_2412_ = lean_nat_dec_le(v_n_2410_, v___x_2411_);
if (v___x_2412_ == 0)
{
lean_object* v___x_2413_; uint8_t v___x_2414_; 
v___x_2413_ = lean_unsigned_to_nat(1u);
v___x_2414_ = lean_nat_dec_le(v_n_2410_, v___x_2413_);
if (v___x_2414_ == 0)
{
uint8_t v___x_2415_; 
v___x_2415_ = 2;
return v___x_2415_;
}
else
{
uint8_t v___x_2416_; 
v___x_2416_ = 1;
return v___x_2416_;
}
}
else
{
uint8_t v___x_2417_; 
v___x_2417_ = 0;
return v___x_2417_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_EventKind_ofNat___boxed(lean_object* v_n_2418_){
_start:
{
uint8_t v_res_2419_; lean_object* v_r_2420_; 
v_res_2419_ = lp_algalVerification_Algal_Replay_EventKind_ofNat(v_n_2418_);
lean_dec(v_n_2418_);
v_r_2420_ = lean_box(v_res_2419_);
return v_r_2420_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEventKind(uint8_t v_x_2421_, uint8_t v_y_2422_){
_start:
{
lean_object* v___x_2423_; lean_object* v___x_2424_; uint8_t v___x_2425_; 
v___x_2423_ = lp_algalVerification_Algal_Replay_EventKind_ctorIdx(v_x_2421_);
v___x_2424_ = lp_algalVerification_Algal_Replay_EventKind_ctorIdx(v_y_2422_);
v___x_2425_ = lean_nat_dec_eq(v___x_2423_, v___x_2424_);
lean_dec(v___x_2424_);
lean_dec(v___x_2423_);
return v___x_2425_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEventKind___boxed(lean_object* v_x_2426_, lean_object* v_y_2427_){
_start:
{
uint8_t v_x_13__boxed_2428_; uint8_t v_y_14__boxed_2429_; uint8_t v_res_2430_; lean_object* v_r_2431_; 
v_x_13__boxed_2428_ = lean_unbox(v_x_2426_);
v_y_14__boxed_2429_ = lean_unbox(v_y_2427_);
v_res_2430_ = lp_algalVerification_Algal_Replay_instDecidableEqEventKind(v_x_13__boxed_2428_, v_y_14__boxed_2429_);
v_r_2431_ = lean_box(v_res_2430_);
return v_r_2431_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr(uint8_t v_x_2441_, lean_object* v_prec_2442_){
_start:
{
lean_object* v___y_2444_; lean_object* v___y_2451_; lean_object* v___y_2458_; 
switch(v_x_2441_)
{
case 0:
{
lean_object* v___x_2464_; uint8_t v___x_2465_; 
v___x_2464_ = lean_unsigned_to_nat(1024u);
v___x_2465_ = lean_nat_dec_le(v___x_2464_, v_prec_2442_);
if (v___x_2465_ == 0)
{
lean_object* v___x_2466_; 
v___x_2466_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_2444_ = v___x_2466_;
goto v___jp_2443_;
}
else
{
lean_object* v___x_2467_; 
v___x_2467_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_2444_ = v___x_2467_;
goto v___jp_2443_;
}
}
case 1:
{
lean_object* v___x_2468_; uint8_t v___x_2469_; 
v___x_2468_ = lean_unsigned_to_nat(1024u);
v___x_2469_ = lean_nat_dec_le(v___x_2468_, v_prec_2442_);
if (v___x_2469_ == 0)
{
lean_object* v___x_2470_; 
v___x_2470_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_2451_ = v___x_2470_;
goto v___jp_2450_;
}
else
{
lean_object* v___x_2471_; 
v___x_2471_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_2451_ = v___x_2471_;
goto v___jp_2450_;
}
}
default: 
{
lean_object* v___x_2472_; uint8_t v___x_2473_; 
v___x_2472_ = lean_unsigned_to_nat(1024u);
v___x_2473_ = lean_nat_dec_le(v___x_2472_, v_prec_2442_);
if (v___x_2473_ == 0)
{
lean_object* v___x_2474_; 
v___x_2474_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_2458_ = v___x_2474_;
goto v___jp_2457_;
}
else
{
lean_object* v___x_2475_; 
v___x_2475_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_2458_ = v___x_2475_;
goto v___jp_2457_;
}
}
}
v___jp_2443_:
{
lean_object* v___x_2445_; lean_object* v___x_2446_; uint8_t v___x_2447_; lean_object* v___x_2448_; lean_object* v___x_2449_; 
v___x_2445_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__1));
lean_inc(v___y_2444_);
v___x_2446_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2446_, 0, v___y_2444_);
lean_ctor_set(v___x_2446_, 1, v___x_2445_);
v___x_2447_ = 0;
v___x_2448_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2448_, 0, v___x_2446_);
lean_ctor_set_uint8(v___x_2448_, sizeof(void*)*1, v___x_2447_);
v___x_2449_ = l_Repr_addAppParen(v___x_2448_, v_prec_2442_);
return v___x_2449_;
}
v___jp_2450_:
{
lean_object* v___x_2452_; lean_object* v___x_2453_; uint8_t v___x_2454_; lean_object* v___x_2455_; lean_object* v___x_2456_; 
v___x_2452_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__3));
lean_inc(v___y_2451_);
v___x_2453_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2453_, 0, v___y_2451_);
lean_ctor_set(v___x_2453_, 1, v___x_2452_);
v___x_2454_ = 0;
v___x_2455_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2455_, 0, v___x_2453_);
lean_ctor_set_uint8(v___x_2455_, sizeof(void*)*1, v___x_2454_);
v___x_2456_ = l_Repr_addAppParen(v___x_2455_, v_prec_2442_);
return v___x_2456_;
}
v___jp_2457_:
{
lean_object* v___x_2459_; lean_object* v___x_2460_; uint8_t v___x_2461_; lean_object* v___x_2462_; lean_object* v___x_2463_; 
v___x_2459_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprEventKind_repr___closed__5));
lean_inc(v___y_2458_);
v___x_2460_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_2460_, 0, v___y_2458_);
lean_ctor_set(v___x_2460_, 1, v___x_2459_);
v___x_2461_ = 0;
v___x_2462_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_2462_, 0, v___x_2460_);
lean_ctor_set_uint8(v___x_2462_, sizeof(void*)*1, v___x_2461_);
v___x_2463_ = l_Repr_addAppParen(v___x_2462_, v_prec_2442_);
return v___x_2463_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprEventKind_repr___boxed(lean_object* v_x_2476_, lean_object* v_prec_2477_){
_start:
{
uint8_t v_x_173__boxed_2478_; lean_object* v_res_2479_; 
v_x_173__boxed_2478_ = lean_unbox(v_x_2476_);
v_res_2479_ = lp_algalVerification_Algal_Replay_instReprEventKind_repr(v_x_173__boxed_2478_, v_prec_2477_);
lean_dec(v_prec_2477_);
return v_res_2479_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqEventKind_beq(uint8_t v_x_2482_, uint8_t v_y_2483_){
_start:
{
lean_object* v___x_2484_; lean_object* v___x_2485_; uint8_t v___x_2486_; 
v___x_2484_ = lp_algalVerification_Algal_Replay_EventKind_ctorIdx(v_x_2482_);
v___x_2485_ = lp_algalVerification_Algal_Replay_EventKind_ctorIdx(v_y_2483_);
v___x_2486_ = lean_nat_dec_eq(v___x_2484_, v___x_2485_);
lean_dec(v___x_2485_);
lean_dec(v___x_2484_);
return v___x_2486_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqEventKind_beq___boxed(lean_object* v_x_2487_, lean_object* v_y_2488_){
_start:
{
uint8_t v_x_17__boxed_2489_; uint8_t v_y_18__boxed_2490_; uint8_t v_res_2491_; lean_object* v_r_2492_; 
v_x_17__boxed_2489_ = lean_unbox(v_x_2487_);
v_y_18__boxed_2490_ = lean_unbox(v_y_2488_);
v_res_2491_ = lp_algalVerification_Algal_Replay_instBEqEventKind_beq(v_x_17__boxed_2489_, v_y_18__boxed_2490_);
v_r_2492_ = lean_box(v_res_2491_);
return v_r_2492_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq(lean_object* v_x_2495_, lean_object* v_x_2496_){
_start:
{
lean_object* v_seq_2497_; uint8_t v_kind_2498_; lean_object* v_path_2499_; lean_object* v_request_2500_; lean_object* v_seq_2501_; uint8_t v_kind_2502_; lean_object* v_path_2503_; lean_object* v_request_2504_; uint8_t v___x_2505_; 
v_seq_2497_ = lean_ctor_get(v_x_2495_, 0);
lean_inc(v_seq_2497_);
v_kind_2498_ = lean_ctor_get_uint8(v_x_2495_, sizeof(void*)*3);
v_path_2499_ = lean_ctor_get(v_x_2495_, 1);
lean_inc(v_path_2499_);
v_request_2500_ = lean_ctor_get(v_x_2495_, 2);
lean_inc(v_request_2500_);
lean_dec_ref(v_x_2495_);
v_seq_2501_ = lean_ctor_get(v_x_2496_, 0);
lean_inc(v_seq_2501_);
v_kind_2502_ = lean_ctor_get_uint8(v_x_2496_, sizeof(void*)*3);
v_path_2503_ = lean_ctor_get(v_x_2496_, 1);
lean_inc(v_path_2503_);
v_request_2504_ = lean_ctor_get(v_x_2496_, 2);
lean_inc(v_request_2504_);
lean_dec_ref(v_x_2496_);
v___x_2505_ = lean_nat_dec_eq(v_seq_2497_, v_seq_2501_);
lean_dec(v_seq_2501_);
lean_dec(v_seq_2497_);
if (v___x_2505_ == 0)
{
lean_dec(v_request_2504_);
lean_dec(v_path_2503_);
lean_dec(v_request_2500_);
lean_dec(v_path_2499_);
return v___x_2505_;
}
else
{
uint8_t v___x_2506_; 
v___x_2506_ = lp_algalVerification_Algal_Replay_instDecidableEqEventKind(v_kind_2498_, v_kind_2502_);
if (v___x_2506_ == 0)
{
lean_dec(v_request_2504_);
lean_dec(v_path_2503_);
lean_dec(v_request_2500_);
lean_dec(v_path_2499_);
return v___x_2506_;
}
else
{
lean_object* v___x_2507_; uint8_t v___x_2508_; 
v___x_2507_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_2508_ = l_Option_instDecidableEq___redArg(v___x_2507_, v_path_2499_, v_path_2503_);
if (v___x_2508_ == 0)
{
lean_dec(v_request_2504_);
lean_dec(v_request_2500_);
return v___x_2508_;
}
else
{
lean_object* v___x_2509_; uint8_t v___x_2510_; 
v___x_2509_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqRequest___boxed), 2, 0);
v___x_2510_ = l_Option_instDecidableEq___redArg(v___x_2509_, v_request_2500_, v_request_2504_);
return v___x_2510_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq___boxed(lean_object* v_x_2511_, lean_object* v_x_2512_){
_start:
{
uint8_t v_res_2513_; lean_object* v_r_2514_; 
v_res_2513_ = lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq(v_x_2511_, v_x_2512_);
v_r_2514_ = lean_box(v_res_2513_);
return v_r_2514_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqEvent(lean_object* v_x_2515_, lean_object* v_x_2516_){
_start:
{
uint8_t v___x_2517_; 
v___x_2517_ = lp_algalVerification_Algal_Replay_instDecidableEqEvent_decEq(v_x_2515_, v_x_2516_);
return v___x_2517_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqEvent___boxed(lean_object* v_x_2518_, lean_object* v_x_2519_){
_start:
{
uint8_t v_res_2520_; lean_object* v_r_2521_; 
v_res_2520_ = lp_algalVerification_Algal_Replay_instDecidableEqEvent(v_x_2518_, v_x_2519_);
v_r_2521_ = lean_box(v_res_2520_);
return v_r_2521_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(lean_object* v_x_2522_, lean_object* v_x_2523_){
_start:
{
lean_object* v_runtime_2524_; lean_object* v_manifest_2525_; lean_object* v_manifestKey_2526_; lean_object* v_args_2527_; uint8_t v_outcome_2528_; lean_object* v_cells_2529_; lean_object* v_effects_2530_; lean_object* v_events_2531_; lean_object* v_work_2532_; lean_object* v_failure_2533_; lean_object* v_runtime_2534_; lean_object* v_manifest_2535_; lean_object* v_manifestKey_2536_; lean_object* v_args_2537_; uint8_t v_outcome_2538_; lean_object* v_cells_2539_; lean_object* v_effects_2540_; lean_object* v_events_2541_; lean_object* v_work_2542_; lean_object* v_failure_2543_; uint8_t v___x_2544_; 
v_runtime_2524_ = lean_ctor_get(v_x_2522_, 0);
lean_inc_ref(v_runtime_2524_);
v_manifest_2525_ = lean_ctor_get(v_x_2522_, 1);
lean_inc_ref(v_manifest_2525_);
v_manifestKey_2526_ = lean_ctor_get(v_x_2522_, 2);
lean_inc_ref(v_manifestKey_2526_);
v_args_2527_ = lean_ctor_get(v_x_2522_, 3);
lean_inc(v_args_2527_);
v_outcome_2528_ = lean_ctor_get_uint8(v_x_2522_, sizeof(void*)*9);
v_cells_2529_ = lean_ctor_get(v_x_2522_, 4);
lean_inc(v_cells_2529_);
v_effects_2530_ = lean_ctor_get(v_x_2522_, 5);
lean_inc(v_effects_2530_);
v_events_2531_ = lean_ctor_get(v_x_2522_, 6);
lean_inc(v_events_2531_);
v_work_2532_ = lean_ctor_get(v_x_2522_, 7);
lean_inc_ref(v_work_2532_);
v_failure_2533_ = lean_ctor_get(v_x_2522_, 8);
lean_inc(v_failure_2533_);
lean_dec_ref(v_x_2522_);
v_runtime_2534_ = lean_ctor_get(v_x_2523_, 0);
lean_inc_ref(v_runtime_2534_);
v_manifest_2535_ = lean_ctor_get(v_x_2523_, 1);
lean_inc_ref(v_manifest_2535_);
v_manifestKey_2536_ = lean_ctor_get(v_x_2523_, 2);
lean_inc_ref(v_manifestKey_2536_);
v_args_2537_ = lean_ctor_get(v_x_2523_, 3);
lean_inc(v_args_2537_);
v_outcome_2538_ = lean_ctor_get_uint8(v_x_2523_, sizeof(void*)*9);
v_cells_2539_ = lean_ctor_get(v_x_2523_, 4);
lean_inc(v_cells_2539_);
v_effects_2540_ = lean_ctor_get(v_x_2523_, 5);
lean_inc(v_effects_2540_);
v_events_2541_ = lean_ctor_get(v_x_2523_, 6);
lean_inc(v_events_2541_);
v_work_2542_ = lean_ctor_get(v_x_2523_, 7);
lean_inc_ref(v_work_2542_);
v_failure_2543_ = lean_ctor_get(v_x_2523_, 8);
lean_inc(v_failure_2543_);
lean_dec_ref(v_x_2523_);
v___x_2544_ = lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(v_runtime_2524_, v_runtime_2534_);
lean_dec_ref(v_runtime_2534_);
lean_dec_ref(v_runtime_2524_);
if (v___x_2544_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_cells_2539_);
lean_dec(v_args_2537_);
lean_dec_ref(v_manifestKey_2536_);
lean_dec_ref(v_manifest_2535_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
lean_dec(v_cells_2529_);
lean_dec(v_args_2527_);
lean_dec_ref(v_manifestKey_2526_);
lean_dec_ref(v_manifest_2525_);
return v___x_2544_;
}
else
{
uint8_t v___x_2545_; 
v___x_2545_ = lean_string_dec_eq(v_manifest_2525_, v_manifest_2535_);
lean_dec_ref(v_manifest_2535_);
lean_dec_ref(v_manifest_2525_);
if (v___x_2545_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_cells_2539_);
lean_dec(v_args_2537_);
lean_dec_ref(v_manifestKey_2536_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
lean_dec(v_cells_2529_);
lean_dec(v_args_2527_);
lean_dec_ref(v_manifestKey_2526_);
return v___x_2545_;
}
else
{
uint8_t v___x_2546_; 
v___x_2546_ = lean_string_dec_eq(v_manifestKey_2526_, v_manifestKey_2536_);
lean_dec_ref(v_manifestKey_2536_);
lean_dec_ref(v_manifestKey_2526_);
if (v___x_2546_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_cells_2539_);
lean_dec(v_args_2537_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
lean_dec(v_cells_2529_);
lean_dec(v_args_2527_);
return v___x_2546_;
}
else
{
uint8_t v___x_2547_; 
v___x_2547_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_args_2527_, v_args_2537_);
lean_dec(v_args_2537_);
lean_dec(v_args_2527_);
if (v___x_2547_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_cells_2539_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
lean_dec(v_cells_2529_);
return v___x_2547_;
}
else
{
uint8_t v___x_2548_; 
v___x_2548_ = lp_algalVerification_Algal_Replay_instDecidableEqOutcome(v_outcome_2528_, v_outcome_2538_);
if (v___x_2548_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_cells_2539_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
lean_dec(v_cells_2529_);
return v___x_2548_;
}
else
{
lean_object* v___x_2549_; uint8_t v___x_2550_; 
v___x_2549_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqCellRecord___boxed), 2, 0);
v___x_2550_ = l_instDecidableEqList___redArg(v___x_2549_, v_cells_2529_, v_cells_2539_);
if (v___x_2550_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_effects_2540_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
lean_dec(v_effects_2530_);
return v___x_2550_;
}
else
{
lean_object* v___x_2551_; uint8_t v___x_2552_; 
v___x_2551_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed), 2, 0);
v___x_2552_ = l_instDecidableEqList___redArg(v___x_2551_, v_effects_2530_, v_effects_2540_);
if (v___x_2552_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_events_2541_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
lean_dec(v_events_2531_);
return v___x_2552_;
}
else
{
lean_object* v___x_2553_; uint8_t v___x_2554_; 
v___x_2553_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEvent___boxed), 2, 0);
v___x_2554_ = l_instDecidableEqList___redArg(v___x_2553_, v_events_2531_, v_events_2541_);
if (v___x_2554_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec_ref(v_work_2542_);
lean_dec(v_failure_2533_);
lean_dec_ref(v_work_2532_);
return v___x_2554_;
}
else
{
uint8_t v___x_2555_; 
v___x_2555_ = lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(v_work_2532_, v_work_2542_);
lean_dec_ref(v_work_2542_);
lean_dec_ref(v_work_2532_);
if (v___x_2555_ == 0)
{
lean_dec(v_failure_2543_);
lean_dec(v_failure_2533_);
return v___x_2555_;
}
else
{
lean_object* v___x_2556_; uint8_t v___x_2557_; 
v___x_2556_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed), 2, 0);
v___x_2557_ = l_Option_instDecidableEq___redArg(v___x_2556_, v_failure_2533_, v_failure_2543_);
return v___x_2557_;
}
}
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq___boxed(lean_object* v_x_2558_, lean_object* v_x_2559_){
_start:
{
uint8_t v_res_2560_; lean_object* v_r_2561_; 
v_res_2560_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_x_2558_, v_x_2559_);
v_r_2561_ = lean_box(v_res_2560_);
return v_r_2561_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqFields(lean_object* v_x_2562_, lean_object* v_x_2563_){
_start:
{
uint8_t v___x_2564_; 
v___x_2564_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_x_2562_, v_x_2563_);
return v___x_2564_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqFields___boxed(lean_object* v_x_2565_, lean_object* v_x_2566_){
_start:
{
uint8_t v_res_2567_; lean_object* v_r_2568_; 
v_res_2567_ = lp_algalVerification_Algal_Replay_instDecidableEqFields(v_x_2565_, v_x_2566_);
v_r_2568_ = lean_box(v_res_2567_);
return v_r_2568_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq(lean_object* v_x_2569_, lean_object* v_x_2570_){
_start:
{
lean_object* v_fields_2571_; lean_object* v_digest_2572_; lean_object* v_fields_2573_; lean_object* v_digest_2574_; uint8_t v___x_2575_; 
v_fields_2571_ = lean_ctor_get(v_x_2569_, 0);
lean_inc_ref(v_fields_2571_);
v_digest_2572_ = lean_ctor_get(v_x_2569_, 1);
lean_inc_ref(v_digest_2572_);
lean_dec_ref(v_x_2569_);
v_fields_2573_ = lean_ctor_get(v_x_2570_, 0);
lean_inc_ref(v_fields_2573_);
v_digest_2574_ = lean_ctor_get(v_x_2570_, 1);
lean_inc_ref(v_digest_2574_);
lean_dec_ref(v_x_2570_);
v___x_2575_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_fields_2571_, v_fields_2573_);
if (v___x_2575_ == 0)
{
lean_dec_ref(v_digest_2574_);
lean_dec_ref(v_digest_2572_);
return v___x_2575_;
}
else
{
uint8_t v___x_2576_; 
v___x_2576_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_digest_2572_, v_digest_2574_);
return v___x_2576_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq___boxed(lean_object* v_x_2577_, lean_object* v_x_2578_){
_start:
{
uint8_t v_res_2579_; lean_object* v_r_2580_; 
v_res_2579_ = lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq(v_x_2577_, v_x_2578_);
v_r_2580_ = lean_box(v_res_2579_);
return v_r_2580_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqReceipt(lean_object* v_x_2581_, lean_object* v_x_2582_){
_start:
{
uint8_t v___x_2583_; 
v___x_2583_ = lp_algalVerification_Algal_Replay_instDecidableEqReceipt_decEq(v_x_2581_, v_x_2582_);
return v___x_2583_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqReceipt___boxed(lean_object* v_x_2584_, lean_object* v_x_2585_){
_start:
{
uint8_t v_res_2586_; lean_object* v_r_2587_; 
v_res_2586_ = lp_algalVerification_Algal_Replay_instDecidableEqReceipt(v_x_2584_, v_x_2585_);
v_r_2587_ = lean_box(v_res_2586_);
return v_r_2587_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_workOf(lean_object* v_res_2588_){
_start:
{
lean_object* v_produced_2589_; lean_object* v_steps_2590_; lean_object* v___x_2591_; lean_object* v___x_2592_; lean_object* v___x_2593_; lean_object* v___x_2594_; lean_object* v___x_2595_; lean_object* v___x_2596_; lean_object* v___x_2597_; 
v_produced_2589_ = lean_ctor_get(v_res_2588_, 0);
v_steps_2590_ = lean_ctor_get(v_res_2588_, 4);
v___x_2591_ = l_List_lengthTR___redArg(v_produced_2589_);
v___x_2592_ = lean_unsigned_to_nat(100u);
v___x_2593_ = lean_nat_mul(v_steps_2590_, v___x_2592_);
v___x_2594_ = lean_unsigned_to_nat(500u);
v___x_2595_ = lean_nat_mul(v___x_2591_, v___x_2594_);
v___x_2596_ = lean_nat_add(v___x_2593_, v___x_2595_);
lean_dec(v___x_2595_);
lean_dec(v___x_2593_);
lean_inc(v_steps_2590_);
v___x_2597_ = lean_alloc_ctor(0, 3, 0);
lean_ctor_set(v___x_2597_, 0, v_steps_2590_);
lean_ctor_set(v___x_2597_, 1, v___x_2591_);
lean_ctor_set(v___x_2597_, 2, v___x_2596_);
return v___x_2597_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_workOf___boxed(lean_object* v_res_2598_){
_start:
{
lean_object* v_res_2599_; 
v_res_2599_ = lp_algalVerification_Algal_Replay_workOf(v_res_2598_);
lean_dec_ref(v_res_2598_);
return v_res_2599_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0(lean_object* v_a_2600_, lean_object* v_a_2601_){
_start:
{
if (lean_obj_tag(v_a_2600_) == 0)
{
lean_object* v___x_2602_; 
v___x_2602_ = lean_array_to_list(v_a_2601_);
return v___x_2602_;
}
else
{
lean_object* v_head_2603_; lean_object* v_request_2604_; lean_object* v_tail_2605_; lean_object* v_cell_2606_; lean_object* v___x_2607_; lean_object* v___x_2608_; lean_object* v___x_2609_; uint8_t v___x_2610_; lean_object* v___x_2611_; lean_object* v___x_2612_; lean_object* v___x_2613_; lean_object* v___x_2614_; 
v_head_2603_ = lean_ctor_get(v_a_2600_, 0);
v_request_2604_ = lean_ctor_get(v_head_2603_, 0);
v_tail_2605_ = lean_ctor_get(v_a_2600_, 1);
v_cell_2606_ = lean_ctor_get(v_request_2604_, 0);
v___x_2607_ = lean_array_get_size(v_a_2601_);
v___x_2608_ = lean_unsigned_to_nat(1u);
v___x_2609_ = lean_nat_add(v___x_2607_, v___x_2608_);
v___x_2610_ = 1;
lean_inc_ref(v_cell_2606_);
v___x_2611_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2611_, 0, v_cell_2606_);
lean_inc_ref(v_request_2604_);
v___x_2612_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2612_, 0, v_request_2604_);
v___x_2613_ = lean_alloc_ctor(0, 3, 1);
lean_ctor_set(v___x_2613_, 0, v___x_2609_);
lean_ctor_set(v___x_2613_, 1, v___x_2611_);
lean_ctor_set(v___x_2613_, 2, v___x_2612_);
lean_ctor_set_uint8(v___x_2613_, sizeof(void*)*3, v___x_2610_);
v___x_2614_ = lean_array_push(v_a_2601_, v___x_2613_);
v_a_2600_ = v_tail_2605_;
v_a_2601_ = v___x_2614_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0___boxed(lean_object* v_a_2616_, lean_object* v_a_2617_){
_start:
{
lean_object* v_res_2618_; 
v_res_2618_ = lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0(v_a_2616_, v_a_2617_);
lean_dec(v_a_2616_);
return v_res_2618_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_eventsOf(lean_object* v_res_2628_){
_start:
{
lean_object* v_produced_2629_; lean_object* v___x_2630_; lean_object* v___x_2631_; lean_object* v___x_2632_; lean_object* v___x_2633_; lean_object* v___x_2634_; lean_object* v___x_2635_; lean_object* v___x_2636_; lean_object* v___x_2637_; uint8_t v___x_2638_; lean_object* v___x_2639_; lean_object* v___x_2640_; lean_object* v___x_2641_; lean_object* v___x_2642_; lean_object* v___x_2643_; 
v_produced_2629_ = lean_ctor_get(v_res_2628_, 0);
v___x_2630_ = lean_box(0);
v___x_2631_ = ((lean_object*)(lp_algalVerification_Algal_Replay_eventsOf___closed__0));
v___x_2632_ = ((lean_object*)(lp_algalVerification_Algal_Replay_eventsOf___closed__1));
v___x_2633_ = lp_algalVerification_List_mapIdx_go___at___00Algal_Replay_eventsOf_spec__0(v_produced_2629_, v___x_2632_);
v___x_2634_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_2634_, 0, v___x_2631_);
lean_ctor_set(v___x_2634_, 1, v___x_2633_);
v___x_2635_ = l_List_lengthTR___redArg(v_produced_2629_);
v___x_2636_ = lean_unsigned_to_nat(1u);
v___x_2637_ = lean_nat_add(v___x_2635_, v___x_2636_);
lean_dec(v___x_2635_);
v___x_2638_ = 2;
v___x_2639_ = ((lean_object*)(lp_algalVerification_Algal_Replay_eventsOf___closed__3));
v___x_2640_ = lean_alloc_ctor(0, 3, 1);
lean_ctor_set(v___x_2640_, 0, v___x_2637_);
lean_ctor_set(v___x_2640_, 1, v___x_2639_);
lean_ctor_set(v___x_2640_, 2, v___x_2630_);
lean_ctor_set_uint8(v___x_2640_, sizeof(void*)*3, v___x_2638_);
v___x_2641_ = lean_box(0);
v___x_2642_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_2642_, 0, v___x_2640_);
lean_ctor_set(v___x_2642_, 1, v___x_2641_);
v___x_2643_ = l_List_appendTR___redArg(v___x_2634_, v___x_2642_);
return v___x_2643_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_eventsOf___boxed(lean_object* v_res_2644_){
_start:
{
lean_object* v_res_2645_; 
v_res_2645_ = lp_algalVerification_Algal_Replay_eventsOf(v_res_2644_);
lean_dec_ref(v_res_2644_);
return v_res_2645_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_mintFields(lean_object* v_p_2646_, lean_object* v_args_2647_, lean_object* v_res_2648_, lean_object* v_stamp_2649_){
_start:
{
lean_object* v_manifest_2650_; lean_object* v_key_2651_; lean_object* v_cellsOf_2652_; lean_object* v_produced_2653_; lean_object* v_hist_2654_; lean_object* v_end___2655_; uint8_t v___x_2656_; lean_object* v___x_2657_; lean_object* v___x_2658_; lean_object* v___x_2659_; lean_object* v___x_2660_; lean_object* v___x_2661_; 
v_manifest_2650_ = lean_ctor_get(v_p_2646_, 0);
lean_inc_ref(v_manifest_2650_);
v_key_2651_ = lean_ctor_get(v_p_2646_, 1);
lean_inc_ref(v_key_2651_);
v_cellsOf_2652_ = lean_ctor_get(v_p_2646_, 5);
lean_inc_ref(v_cellsOf_2652_);
lean_dec_ref(v_p_2646_);
v_produced_2653_ = lean_ctor_get(v_res_2648_, 0);
lean_inc(v_produced_2653_);
v_hist_2654_ = lean_ctor_get(v_res_2648_, 1);
v_end___2655_ = lean_ctor_get(v_res_2648_, 3);
lean_inc(v_end___2655_);
v___x_2656_ = lp_algalVerification_Algal_Replay_outcomeOf(v_end___2655_);
lean_inc(v_hist_2654_);
lean_inc(v_args_2647_);
v___x_2657_ = lean_apply_2(v_cellsOf_2652_, v_args_2647_, v_hist_2654_);
v___x_2658_ = lp_algalVerification_Algal_Replay_eventsOf(v_res_2648_);
v___x_2659_ = lp_algalVerification_Algal_Replay_workOf(v_res_2648_);
lean_dec_ref(v_res_2648_);
v___x_2660_ = lp_algalVerification_Algal_Replay_failureOf(v_end___2655_);
lean_dec(v_end___2655_);
v___x_2661_ = lean_alloc_ctor(0, 9, 1);
lean_ctor_set(v___x_2661_, 0, v_stamp_2649_);
lean_ctor_set(v___x_2661_, 1, v_manifest_2650_);
lean_ctor_set(v___x_2661_, 2, v_key_2651_);
lean_ctor_set(v___x_2661_, 3, v_args_2647_);
lean_ctor_set(v___x_2661_, 4, v___x_2657_);
lean_ctor_set(v___x_2661_, 5, v_produced_2653_);
lean_ctor_set(v___x_2661_, 6, v___x_2658_);
lean_ctor_set(v___x_2661_, 7, v___x_2659_);
lean_ctor_set(v___x_2661_, 8, v___x_2660_);
lean_ctor_set_uint8(v___x_2661_, sizeof(void*)*9, v___x_2656_);
return v___x_2661_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_mint(lean_object* v_p_2662_, lean_object* v_args_2663_, lean_object* v_res_2664_, lean_object* v_stamp_2665_){
_start:
{
lean_object* v_f_2666_; lean_object* v___x_2667_; 
v_f_2666_ = lp_algalVerification_Algal_Replay_mintFields(v_p_2662_, v_args_2663_, v_res_2664_, v_stamp_2665_);
lean_inc_ref(v_f_2666_);
v___x_2667_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2667_, 0, v_f_2666_);
lean_ctor_set(v___x_2667_, 1, v_f_2666_);
return v___x_2667_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0(lean_object* v_path_2668_, lean_object* v_x_2669_){
_start:
{
if (lean_obj_tag(v_x_2669_) == 0)
{
lean_object* v___x_2670_; 
v___x_2670_ = lean_box(0);
return v___x_2670_;
}
else
{
lean_object* v_head_2671_; lean_object* v_tail_2672_; uint8_t v___y_2674_; lean_object* v_path_2677_; lean_object* v_slot_2678_; uint8_t v___x_2679_; 
v_head_2671_ = lean_ctor_get(v_x_2669_, 0);
v_tail_2672_ = lean_ctor_get(v_x_2669_, 1);
v_path_2677_ = lean_ctor_get(v_head_2671_, 0);
v_slot_2678_ = lean_ctor_get(v_head_2671_, 4);
v___x_2679_ = lean_string_dec_eq(v_path_2677_, v_path_2668_);
if (v___x_2679_ == 0)
{
v___y_2674_ = v___x_2679_;
goto v___jp_2673_;
}
else
{
if (lean_obj_tag(v_slot_2678_) == 1)
{
lean_object* v_val_2680_; lean_object* v_snd_2681_; uint8_t v___x_2682_; 
v_val_2680_ = lean_ctor_get(v_slot_2678_, 0);
v_snd_2681_ = lean_ctor_get(v_val_2680_, 1);
v___x_2682_ = lean_unbox(v_snd_2681_);
if (v___x_2682_ == 0)
{
v___y_2674_ = v___x_2679_;
goto v___jp_2673_;
}
else
{
v_x_2669_ = v_tail_2672_;
goto _start;
}
}
else
{
v_x_2669_ = v_tail_2672_;
goto _start;
}
}
v___jp_2673_:
{
if (v___y_2674_ == 0)
{
v_x_2669_ = v_tail_2672_;
goto _start;
}
else
{
lean_object* v___x_2676_; 
lean_inc(v_head_2671_);
v___x_2676_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2676_, 0, v_head_2671_);
return v___x_2676_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0___boxed(lean_object* v_path_2685_, lean_object* v_x_2686_){
_start:
{
lean_object* v_res_2687_; 
v_res_2687_ = lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0(v_path_2685_, v_x_2686_);
lean_dec(v_x_2686_);
lean_dec_ref(v_path_2685_);
return v_res_2687_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf(lean_object* v_cells_2691_, lean_object* v_path_2692_){
_start:
{
lean_object* v___x_2693_; 
v___x_2693_ = lp_algalVerification_List_find_x3f___at___00Algal_Replay_replaySlotsOf_spec__0(v_path_2692_, v_cells_2691_);
if (lean_obj_tag(v___x_2693_) == 0)
{
lean_object* v___x_2694_; 
v___x_2694_ = lean_box(0);
return v___x_2694_;
}
else
{
lean_object* v_val_2695_; lean_object* v___x_2697_; uint8_t v_isShared_2698_; uint8_t v_isSharedCheck_2709_; 
v_val_2695_ = lean_ctor_get(v___x_2693_, 0);
v_isSharedCheck_2709_ = !lean_is_exclusive(v___x_2693_);
if (v_isSharedCheck_2709_ == 0)
{
v___x_2697_ = v___x_2693_;
v_isShared_2698_ = v_isSharedCheck_2709_;
goto v_resetjp_2696_;
}
else
{
lean_inc(v_val_2695_);
lean_dec(v___x_2693_);
v___x_2697_ = lean_box(0);
v_isShared_2698_ = v_isSharedCheck_2709_;
goto v_resetjp_2696_;
}
v_resetjp_2696_:
{
uint8_t v_status_2699_; lean_object* v_outputs_2700_; uint8_t v___x_2701_; uint8_t v___x_2702_; 
v_status_2699_ = lean_ctor_get_uint8(v_val_2695_, sizeof(void*)*5);
v_outputs_2700_ = lean_ctor_get(v_val_2695_, 1);
lean_inc(v_outputs_2700_);
lean_dec(v_val_2695_);
v___x_2701_ = 0;
v___x_2702_ = lp_algalVerification_Algal_Replay_instBEqCellStatus_beq(v_status_2699_, v___x_2701_);
if (v___x_2702_ == 0)
{
lean_object* v___x_2703_; 
lean_dec(v_outputs_2700_);
lean_del_object(v___x_2697_);
v___x_2703_ = ((lean_object*)(lp_algalVerification_Algal_Replay_replaySlotsOf___closed__0));
return v___x_2703_;
}
else
{
lean_object* v___x_2704_; lean_object* v___x_2705_; lean_object* v___x_2707_; 
v___x_2704_ = ((lean_object*)(lp_algalVerification_Algal_Replay_replaySlotsOf___closed__1));
v___x_2705_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_outputs_2700_, v___x_2704_);
lean_dec(v_outputs_2700_);
if (v_isShared_2698_ == 0)
{
lean_ctor_set(v___x_2697_, 0, v___x_2705_);
v___x_2707_ = v___x_2697_;
goto v_reusejp_2706_;
}
else
{
lean_object* v_reuseFailAlloc_2708_; 
v_reuseFailAlloc_2708_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2708_, 0, v___x_2705_);
v___x_2707_ = v_reuseFailAlloc_2708_;
goto v_reusejp_2706_;
}
v_reusejp_2706_:
{
return v___x_2707_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_replaySlotsOf___boxed(lean_object* v_cells_2710_, lean_object* v_path_2711_){
_start:
{
lean_object* v_res_2712_; 
v_res_2712_ = lp_algalVerification_Algal_Replay_replaySlotsOf(v_cells_2710_, v_path_2711_);
lean_dec_ref(v_path_2711_);
lean_dec(v_cells_2710_);
return v_res_2712_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0(lean_object* v_path_2713_, lean_object* v_x_2714_){
_start:
{
if (lean_obj_tag(v_x_2714_) == 0)
{
uint8_t v___x_2715_; 
v___x_2715_ = 0;
return v___x_2715_;
}
else
{
lean_object* v_head_2716_; lean_object* v_tail_2717_; lean_object* v_path_2718_; uint8_t v_status_2719_; lean_object* v_slot_2720_; uint8_t v___y_2722_; uint8_t v___x_2729_; 
v_head_2716_ = lean_ctor_get(v_x_2714_, 0);
v_tail_2717_ = lean_ctor_get(v_x_2714_, 1);
v_path_2718_ = lean_ctor_get(v_head_2716_, 0);
v_status_2719_ = lean_ctor_get_uint8(v_head_2716_, sizeof(void*)*5);
v_slot_2720_ = lean_ctor_get(v_head_2716_, 4);
v___x_2729_ = lean_string_dec_eq(v_path_2718_, v_path_2713_);
if (v___x_2729_ == 0)
{
v___y_2722_ = v___x_2729_;
goto v___jp_2721_;
}
else
{
uint8_t v___x_2730_; uint8_t v___x_2731_; 
v___x_2730_ = 0;
v___x_2731_ = lp_algalVerification_Algal_Replay_instBEqCellStatus_beq(v_status_2719_, v___x_2730_);
v___y_2722_ = v___x_2731_;
goto v___jp_2721_;
}
v___jp_2721_:
{
if (v___y_2722_ == 0)
{
v_x_2714_ = v_tail_2717_;
goto _start;
}
else
{
if (lean_obj_tag(v_slot_2720_) == 1)
{
lean_object* v_val_2724_; lean_object* v_snd_2725_; uint8_t v___x_2726_; 
v_val_2724_ = lean_ctor_get(v_slot_2720_, 0);
v_snd_2725_ = lean_ctor_get(v_val_2724_, 1);
v___x_2726_ = lean_unbox(v_snd_2725_);
if (v___x_2726_ == 1)
{
return v___y_2722_;
}
else
{
v_x_2714_ = v_tail_2717_;
goto _start;
}
}
else
{
v_x_2714_ = v_tail_2717_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0___boxed(lean_object* v_path_2732_, lean_object* v_x_2733_){
_start:
{
uint8_t v_res_2734_; lean_object* v_r_2735_; 
v_res_2734_ = lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0(v_path_2732_, v_x_2733_);
lean_dec(v_x_2733_);
lean_dec_ref(v_path_2732_);
v_r_2735_ = lean_box(v_res_2734_);
return v_r_2735_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_settledWritesOf(lean_object* v_cells_2736_, lean_object* v_path_2737_){
_start:
{
uint8_t v___x_2738_; 
v___x_2738_ = lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0(v_path_2737_, v_cells_2736_);
return v___x_2738_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_settledWritesOf___boxed(lean_object* v_cells_2739_, lean_object* v_path_2740_){
_start:
{
uint8_t v_res_2741_; lean_object* v_r_2742_; 
v_res_2741_ = lp_algalVerification_Algal_Replay_settledWritesOf(v_cells_2739_, v_path_2740_);
lean_dec_ref(v_path_2740_);
lean_dec(v_cells_2739_);
v_r_2742_ = lean_box(v_res_2741_);
return v_r_2742_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_verifyCfg___lam__0(lean_object* v_x_2743_){
_start:
{
uint8_t v___x_2744_; 
v___x_2744_ = 0;
return v___x_2744_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__0___boxed(lean_object* v_x_2745_){
_start:
{
uint8_t v_res_2746_; lean_object* v_r_2747_; 
v_res_2746_ = lp_algalVerification_Algal_Replay_verifyCfg___lam__0(v_x_2745_);
lean_dec_ref(v_x_2745_);
v_r_2747_ = lean_box(v_res_2746_);
return v_r_2747_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__1(lean_object* v___y_2748_){
_start:
{
lean_object* v___x_2749_; 
v___x_2749_ = lean_box(0);
return v___x_2749_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg___lam__1___boxed(lean_object* v___y_2750_){
_start:
{
lean_object* v_res_2751_; 
v_res_2751_ = lp_algalVerification_Algal_Replay_verifyCfg___lam__1(v___y_2750_);
lean_dec_ref(v___y_2750_);
return v_res_2751_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verifyCfg(lean_object* v_r_2754_, lean_object* v_store_2755_){
_start:
{
lean_object* v_fields_2756_; lean_object* v_cells_2757_; lean_object* v___f_2758_; lean_object* v___f_2759_; lean_object* v___x_2760_; uint8_t v___x_2761_; uint8_t v___x_2762_; lean_object* v___x_2763_; 
v_fields_2756_ = lean_ctor_get(v_r_2754_, 0);
lean_inc_ref(v_fields_2756_);
lean_dec_ref(v_r_2754_);
v_cells_2757_ = lean_ctor_get(v_fields_2756_, 4);
lean_inc(v_cells_2757_);
lean_dec_ref(v_fields_2756_);
v___f_2758_ = ((lean_object*)(lp_algalVerification_Algal_Replay_verifyCfg___closed__0));
v___f_2759_ = ((lean_object*)(lp_algalVerification_Algal_Replay_verifyCfg___closed__1));
v___x_2760_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_replaySlotsOf___boxed), 2, 1);
lean_closure_set(v___x_2760_, 0, v_cells_2757_);
v___x_2761_ = 1;
v___x_2762_ = 0;
v___x_2763_ = lean_alloc_ctor(0, 4, 2);
lean_ctor_set(v___x_2763_, 0, v___f_2759_);
lean_ctor_set(v___x_2763_, 1, v___x_2760_);
lean_ctor_set(v___x_2763_, 2, v___f_2758_);
lean_ctor_set(v___x_2763_, 3, v_store_2755_);
lean_ctor_set_uint8(v___x_2763_, sizeof(void*)*4, v___x_2761_);
lean_ctor_set_uint8(v___x_2763_, sizeof(void*)*4 + 1, v___x_2762_);
return v___x_2763_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(uint8_t v_x_2764_){
_start:
{
switch(v_x_2764_)
{
case 0:
{
lean_object* v___x_2765_; 
v___x_2765_ = lean_unsigned_to_nat(0u);
return v___x_2765_;
}
case 1:
{
lean_object* v___x_2766_; 
v___x_2766_ = lean_unsigned_to_nat(1u);
return v___x_2766_;
}
case 2:
{
lean_object* v___x_2767_; 
v___x_2767_ = lean_unsigned_to_nat(2u);
return v___x_2767_;
}
case 3:
{
lean_object* v___x_2768_; 
v___x_2768_ = lean_unsigned_to_nat(3u);
return v___x_2768_;
}
case 4:
{
lean_object* v___x_2769_; 
v___x_2769_ = lean_unsigned_to_nat(4u);
return v___x_2769_;
}
case 5:
{
lean_object* v___x_2770_; 
v___x_2770_ = lean_unsigned_to_nat(5u);
return v___x_2770_;
}
case 6:
{
lean_object* v___x_2771_; 
v___x_2771_ = lean_unsigned_to_nat(6u);
return v___x_2771_;
}
case 7:
{
lean_object* v___x_2772_; 
v___x_2772_ = lean_unsigned_to_nat(7u);
return v___x_2772_;
}
case 8:
{
lean_object* v___x_2773_; 
v___x_2773_ = lean_unsigned_to_nat(8u);
return v___x_2773_;
}
case 9:
{
lean_object* v___x_2774_; 
v___x_2774_ = lean_unsigned_to_nat(9u);
return v___x_2774_;
}
case 10:
{
lean_object* v___x_2775_; 
v___x_2775_ = lean_unsigned_to_nat(10u);
return v___x_2775_;
}
default: 
{
lean_object* v___x_2776_; 
v___x_2776_ = lean_unsigned_to_nat(11u);
return v___x_2776_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorIdx___boxed(lean_object* v_x_2777_){
_start:
{
uint8_t v_x_boxed_2778_; lean_object* v_res_2779_; 
v_x_boxed_2778_ = lean_unbox(v_x_2777_);
v_res_2779_ = lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(v_x_boxed_2778_);
return v_res_2779_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___redArg(lean_object* v_k_2780_){
_start:
{
lean_inc(v_k_2780_);
return v_k_2780_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___redArg___boxed(lean_object* v_k_2781_){
_start:
{
lean_object* v_res_2782_; 
v_res_2782_ = lp_algalVerification_Algal_Replay_Mismatch_ctorElim___redArg(v_k_2781_);
lean_dec(v_k_2781_);
return v_res_2782_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim(lean_object* v_motive_2783_, lean_object* v_ctorIdx_2784_, uint8_t v_t_2785_, lean_object* v_h_2786_, lean_object* v_k_2787_){
_start:
{
lean_inc(v_k_2787_);
return v_k_2787_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ctorElim___boxed(lean_object* v_motive_2788_, lean_object* v_ctorIdx_2789_, lean_object* v_t_2790_, lean_object* v_h_2791_, lean_object* v_k_2792_){
_start:
{
uint8_t v_t_boxed_2793_; lean_object* v_res_2794_; 
v_t_boxed_2793_ = lean_unbox(v_t_2790_);
v_res_2794_ = lp_algalVerification_Algal_Replay_Mismatch_ctorElim(v_motive_2788_, v_ctorIdx_2789_, v_t_boxed_2793_, v_h_2791_, v_k_2792_);
lean_dec(v_k_2792_);
lean_dec(v_ctorIdx_2789_);
return v_res_2794_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___redArg(lean_object* v_manifestDigest_2795_){
_start:
{
lean_inc(v_manifestDigest_2795_);
return v_manifestDigest_2795_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___redArg___boxed(lean_object* v_manifestDigest_2796_){
_start:
{
lean_object* v_res_2797_; 
v_res_2797_ = lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___redArg(v_manifestDigest_2796_);
lean_dec(v_manifestDigest_2796_);
return v_res_2797_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim(lean_object* v_motive_2798_, uint8_t v_t_2799_, lean_object* v_h_2800_, lean_object* v_manifestDigest_2801_){
_start:
{
lean_inc(v_manifestDigest_2801_);
return v_manifestDigest_2801_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim___boxed(lean_object* v_motive_2802_, lean_object* v_t_2803_, lean_object* v_h_2804_, lean_object* v_manifestDigest_2805_){
_start:
{
uint8_t v_t_boxed_2806_; lean_object* v_res_2807_; 
v_t_boxed_2806_ = lean_unbox(v_t_2803_);
v_res_2807_ = lp_algalVerification_Algal_Replay_Mismatch_manifestDigest_elim(v_motive_2802_, v_t_boxed_2806_, v_h_2804_, v_manifestDigest_2805_);
lean_dec(v_manifestDigest_2805_);
return v_res_2807_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___redArg(lean_object* v_outcome_2808_){
_start:
{
lean_inc(v_outcome_2808_);
return v_outcome_2808_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___redArg___boxed(lean_object* v_outcome_2809_){
_start:
{
lean_object* v_res_2810_; 
v_res_2810_ = lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___redArg(v_outcome_2809_);
lean_dec(v_outcome_2809_);
return v_res_2810_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim(lean_object* v_motive_2811_, uint8_t v_t_2812_, lean_object* v_h_2813_, lean_object* v_outcome_2814_){
_start:
{
lean_inc(v_outcome_2814_);
return v_outcome_2814_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_outcome_elim___boxed(lean_object* v_motive_2815_, lean_object* v_t_2816_, lean_object* v_h_2817_, lean_object* v_outcome_2818_){
_start:
{
uint8_t v_t_boxed_2819_; lean_object* v_res_2820_; 
v_t_boxed_2819_ = lean_unbox(v_t_2816_);
v_res_2820_ = lp_algalVerification_Algal_Replay_Mismatch_outcome_elim(v_motive_2815_, v_t_boxed_2819_, v_h_2817_, v_outcome_2818_);
lean_dec(v_outcome_2818_);
return v_res_2820_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___redArg(lean_object* v_cells_2821_){
_start:
{
lean_inc(v_cells_2821_);
return v_cells_2821_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___redArg___boxed(lean_object* v_cells_2822_){
_start:
{
lean_object* v_res_2823_; 
v_res_2823_ = lp_algalVerification_Algal_Replay_Mismatch_cells_elim___redArg(v_cells_2822_);
lean_dec(v_cells_2822_);
return v_res_2823_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim(lean_object* v_motive_2824_, uint8_t v_t_2825_, lean_object* v_h_2826_, lean_object* v_cells_2827_){
_start:
{
lean_inc(v_cells_2827_);
return v_cells_2827_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_cells_elim___boxed(lean_object* v_motive_2828_, lean_object* v_t_2829_, lean_object* v_h_2830_, lean_object* v_cells_2831_){
_start:
{
uint8_t v_t_boxed_2832_; lean_object* v_res_2833_; 
v_t_boxed_2832_ = lean_unbox(v_t_2829_);
v_res_2833_ = lp_algalVerification_Algal_Replay_Mismatch_cells_elim(v_motive_2828_, v_t_boxed_2832_, v_h_2830_, v_cells_2831_);
lean_dec(v_cells_2831_);
return v_res_2833_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___redArg(lean_object* v_effects_2834_){
_start:
{
lean_inc(v_effects_2834_);
return v_effects_2834_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___redArg___boxed(lean_object* v_effects_2835_){
_start:
{
lean_object* v_res_2836_; 
v_res_2836_ = lp_algalVerification_Algal_Replay_Mismatch_effects_elim___redArg(v_effects_2835_);
lean_dec(v_effects_2835_);
return v_res_2836_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim(lean_object* v_motive_2837_, uint8_t v_t_2838_, lean_object* v_h_2839_, lean_object* v_effects_2840_){
_start:
{
lean_inc(v_effects_2840_);
return v_effects_2840_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_effects_elim___boxed(lean_object* v_motive_2841_, lean_object* v_t_2842_, lean_object* v_h_2843_, lean_object* v_effects_2844_){
_start:
{
uint8_t v_t_boxed_2845_; lean_object* v_res_2846_; 
v_t_boxed_2845_ = lean_unbox(v_t_2842_);
v_res_2846_ = lp_algalVerification_Algal_Replay_Mismatch_effects_elim(v_motive_2841_, v_t_boxed_2845_, v_h_2843_, v_effects_2844_);
lean_dec(v_effects_2844_);
return v_res_2846_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___redArg(lean_object* v_events_2847_){
_start:
{
lean_inc(v_events_2847_);
return v_events_2847_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___redArg___boxed(lean_object* v_events_2848_){
_start:
{
lean_object* v_res_2849_; 
v_res_2849_ = lp_algalVerification_Algal_Replay_Mismatch_events_elim___redArg(v_events_2848_);
lean_dec(v_events_2848_);
return v_res_2849_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim(lean_object* v_motive_2850_, uint8_t v_t_2851_, lean_object* v_h_2852_, lean_object* v_events_2853_){
_start:
{
lean_inc(v_events_2853_);
return v_events_2853_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_events_elim___boxed(lean_object* v_motive_2854_, lean_object* v_t_2855_, lean_object* v_h_2856_, lean_object* v_events_2857_){
_start:
{
uint8_t v_t_boxed_2858_; lean_object* v_res_2859_; 
v_t_boxed_2858_ = lean_unbox(v_t_2855_);
v_res_2859_ = lp_algalVerification_Algal_Replay_Mismatch_events_elim(v_motive_2854_, v_t_boxed_2858_, v_h_2856_, v_events_2857_);
lean_dec(v_events_2857_);
return v_res_2859_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___redArg(lean_object* v_work_2860_){
_start:
{
lean_inc(v_work_2860_);
return v_work_2860_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___redArg___boxed(lean_object* v_work_2861_){
_start:
{
lean_object* v_res_2862_; 
v_res_2862_ = lp_algalVerification_Algal_Replay_Mismatch_work_elim___redArg(v_work_2861_);
lean_dec(v_work_2861_);
return v_res_2862_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim(lean_object* v_motive_2863_, uint8_t v_t_2864_, lean_object* v_h_2865_, lean_object* v_work_2866_){
_start:
{
lean_inc(v_work_2866_);
return v_work_2866_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_work_elim___boxed(lean_object* v_motive_2867_, lean_object* v_t_2868_, lean_object* v_h_2869_, lean_object* v_work_2870_){
_start:
{
uint8_t v_t_boxed_2871_; lean_object* v_res_2872_; 
v_t_boxed_2871_ = lean_unbox(v_t_2868_);
v_res_2872_ = lp_algalVerification_Algal_Replay_Mismatch_work_elim(v_motive_2867_, v_t_boxed_2871_, v_h_2869_, v_work_2870_);
lean_dec(v_work_2870_);
return v_res_2872_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___redArg(lean_object* v_failure_2873_){
_start:
{
lean_inc(v_failure_2873_);
return v_failure_2873_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___redArg___boxed(lean_object* v_failure_2874_){
_start:
{
lean_object* v_res_2875_; 
v_res_2875_ = lp_algalVerification_Algal_Replay_Mismatch_failure_elim___redArg(v_failure_2874_);
lean_dec(v_failure_2874_);
return v_res_2875_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim(lean_object* v_motive_2876_, uint8_t v_t_2877_, lean_object* v_h_2878_, lean_object* v_failure_2879_){
_start:
{
lean_inc(v_failure_2879_);
return v_failure_2879_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_failure_elim___boxed(lean_object* v_motive_2880_, lean_object* v_t_2881_, lean_object* v_h_2882_, lean_object* v_failure_2883_){
_start:
{
uint8_t v_t_boxed_2884_; lean_object* v_res_2885_; 
v_t_boxed_2884_ = lean_unbox(v_t_2881_);
v_res_2885_ = lp_algalVerification_Algal_Replay_Mismatch_failure_elim(v_motive_2880_, v_t_boxed_2884_, v_h_2882_, v_failure_2883_);
lean_dec(v_failure_2883_);
return v_res_2885_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___redArg(lean_object* v_args_2886_){
_start:
{
lean_inc(v_args_2886_);
return v_args_2886_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___redArg___boxed(lean_object* v_args_2887_){
_start:
{
lean_object* v_res_2888_; 
v_res_2888_ = lp_algalVerification_Algal_Replay_Mismatch_args_elim___redArg(v_args_2887_);
lean_dec(v_args_2887_);
return v_res_2888_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim(lean_object* v_motive_2889_, uint8_t v_t_2890_, lean_object* v_h_2891_, lean_object* v_args_2892_){
_start:
{
lean_inc(v_args_2892_);
return v_args_2892_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_args_elim___boxed(lean_object* v_motive_2893_, lean_object* v_t_2894_, lean_object* v_h_2895_, lean_object* v_args_2896_){
_start:
{
uint8_t v_t_boxed_2897_; lean_object* v_res_2898_; 
v_t_boxed_2897_ = lean_unbox(v_t_2894_);
v_res_2898_ = lp_algalVerification_Algal_Replay_Mismatch_args_elim(v_motive_2893_, v_t_boxed_2897_, v_h_2895_, v_args_2896_);
lean_dec(v_args_2896_);
return v_res_2898_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___redArg(lean_object* v_runtime_2899_){
_start:
{
lean_inc(v_runtime_2899_);
return v_runtime_2899_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___redArg___boxed(lean_object* v_runtime_2900_){
_start:
{
lean_object* v_res_2901_; 
v_res_2901_ = lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___redArg(v_runtime_2900_);
lean_dec(v_runtime_2900_);
return v_res_2901_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim(lean_object* v_motive_2902_, uint8_t v_t_2903_, lean_object* v_h_2904_, lean_object* v_runtime_2905_){
_start:
{
lean_inc(v_runtime_2905_);
return v_runtime_2905_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_runtime_elim___boxed(lean_object* v_motive_2906_, lean_object* v_t_2907_, lean_object* v_h_2908_, lean_object* v_runtime_2909_){
_start:
{
uint8_t v_t_boxed_2910_; lean_object* v_res_2911_; 
v_t_boxed_2910_ = lean_unbox(v_t_2907_);
v_res_2911_ = lp_algalVerification_Algal_Replay_Mismatch_runtime_elim(v_motive_2906_, v_t_boxed_2910_, v_h_2908_, v_runtime_2909_);
lean_dec(v_runtime_2909_);
return v_res_2911_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___redArg(lean_object* v_manifestKey_2912_){
_start:
{
lean_inc(v_manifestKey_2912_);
return v_manifestKey_2912_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___redArg___boxed(lean_object* v_manifestKey_2913_){
_start:
{
lean_object* v_res_2914_; 
v_res_2914_ = lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___redArg(v_manifestKey_2913_);
lean_dec(v_manifestKey_2913_);
return v_res_2914_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim(lean_object* v_motive_2915_, uint8_t v_t_2916_, lean_object* v_h_2917_, lean_object* v_manifestKey_2918_){
_start:
{
lean_inc(v_manifestKey_2918_);
return v_manifestKey_2918_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim___boxed(lean_object* v_motive_2919_, lean_object* v_t_2920_, lean_object* v_h_2921_, lean_object* v_manifestKey_2922_){
_start:
{
uint8_t v_t_boxed_2923_; lean_object* v_res_2924_; 
v_t_boxed_2923_ = lean_unbox(v_t_2920_);
v_res_2924_ = lp_algalVerification_Algal_Replay_Mismatch_manifestKey_elim(v_motive_2919_, v_t_boxed_2923_, v_h_2921_, v_manifestKey_2922_);
lean_dec(v_manifestKey_2922_);
return v_res_2924_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___redArg(lean_object* v_digest_2925_){
_start:
{
lean_inc(v_digest_2925_);
return v_digest_2925_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___redArg___boxed(lean_object* v_digest_2926_){
_start:
{
lean_object* v_res_2927_; 
v_res_2927_ = lp_algalVerification_Algal_Replay_Mismatch_digest_elim___redArg(v_digest_2926_);
lean_dec(v_digest_2926_);
return v_res_2927_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim(lean_object* v_motive_2928_, uint8_t v_t_2929_, lean_object* v_h_2930_, lean_object* v_digest_2931_){
_start:
{
lean_inc(v_digest_2931_);
return v_digest_2931_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_digest_elim___boxed(lean_object* v_motive_2932_, lean_object* v_t_2933_, lean_object* v_h_2934_, lean_object* v_digest_2935_){
_start:
{
uint8_t v_t_boxed_2936_; lean_object* v_res_2937_; 
v_t_boxed_2936_ = lean_unbox(v_t_2933_);
v_res_2937_ = lp_algalVerification_Algal_Replay_Mismatch_digest_elim(v_motive_2932_, v_t_boxed_2936_, v_h_2934_, v_digest_2935_);
lean_dec(v_digest_2935_);
return v_res_2937_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___redArg(lean_object* v_records_2938_){
_start:
{
lean_inc(v_records_2938_);
return v_records_2938_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___redArg___boxed(lean_object* v_records_2939_){
_start:
{
lean_object* v_res_2940_; 
v_res_2940_ = lp_algalVerification_Algal_Replay_Mismatch_records_elim___redArg(v_records_2939_);
lean_dec(v_records_2939_);
return v_res_2940_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim(lean_object* v_motive_2941_, uint8_t v_t_2942_, lean_object* v_h_2943_, lean_object* v_records_2944_){
_start:
{
lean_inc(v_records_2944_);
return v_records_2944_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_records_elim___boxed(lean_object* v_motive_2945_, lean_object* v_t_2946_, lean_object* v_h_2947_, lean_object* v_records_2948_){
_start:
{
uint8_t v_t_boxed_2949_; lean_object* v_res_2950_; 
v_t_boxed_2949_ = lean_unbox(v_t_2946_);
v_res_2950_ = lp_algalVerification_Algal_Replay_Mismatch_records_elim(v_motive_2945_, v_t_boxed_2949_, v_h_2947_, v_records_2948_);
lean_dec(v_records_2948_);
return v_res_2950_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_Mismatch_ofNat(lean_object* v_n_2951_){
_start:
{
lean_object* v___x_2952_; uint8_t v___x_2953_; 
v___x_2952_ = lean_unsigned_to_nat(5u);
v___x_2953_ = lean_nat_dec_le(v_n_2951_, v___x_2952_);
if (v___x_2953_ == 0)
{
lean_object* v___x_2954_; uint8_t v___x_2955_; 
v___x_2954_ = lean_unsigned_to_nat(8u);
v___x_2955_ = lean_nat_dec_le(v_n_2951_, v___x_2954_);
if (v___x_2955_ == 0)
{
lean_object* v___x_2956_; uint8_t v___x_2957_; 
v___x_2956_ = lean_unsigned_to_nat(9u);
v___x_2957_ = lean_nat_dec_le(v_n_2951_, v___x_2956_);
if (v___x_2957_ == 0)
{
lean_object* v___x_2958_; uint8_t v___x_2959_; 
v___x_2958_ = lean_unsigned_to_nat(10u);
v___x_2959_ = lean_nat_dec_le(v_n_2951_, v___x_2958_);
if (v___x_2959_ == 0)
{
uint8_t v___x_2960_; 
v___x_2960_ = 11;
return v___x_2960_;
}
else
{
uint8_t v___x_2961_; 
v___x_2961_ = 10;
return v___x_2961_;
}
}
else
{
uint8_t v___x_2962_; 
v___x_2962_ = 9;
return v___x_2962_;
}
}
else
{
lean_object* v___x_2963_; uint8_t v___x_2964_; 
v___x_2963_ = lean_unsigned_to_nat(6u);
v___x_2964_ = lean_nat_dec_le(v_n_2951_, v___x_2963_);
if (v___x_2964_ == 0)
{
lean_object* v___x_2965_; uint8_t v___x_2966_; 
v___x_2965_ = lean_unsigned_to_nat(7u);
v___x_2966_ = lean_nat_dec_le(v_n_2951_, v___x_2965_);
if (v___x_2966_ == 0)
{
uint8_t v___x_2967_; 
v___x_2967_ = 8;
return v___x_2967_;
}
else
{
uint8_t v___x_2968_; 
v___x_2968_ = 7;
return v___x_2968_;
}
}
else
{
uint8_t v___x_2969_; 
v___x_2969_ = 6;
return v___x_2969_;
}
}
}
else
{
lean_object* v___x_2970_; uint8_t v___x_2971_; 
v___x_2970_ = lean_unsigned_to_nat(2u);
v___x_2971_ = lean_nat_dec_le(v_n_2951_, v___x_2970_);
if (v___x_2971_ == 0)
{
lean_object* v___x_2972_; uint8_t v___x_2973_; 
v___x_2972_ = lean_unsigned_to_nat(3u);
v___x_2973_ = lean_nat_dec_le(v_n_2951_, v___x_2972_);
if (v___x_2973_ == 0)
{
lean_object* v___x_2974_; uint8_t v___x_2975_; 
v___x_2974_ = lean_unsigned_to_nat(4u);
v___x_2975_ = lean_nat_dec_le(v_n_2951_, v___x_2974_);
if (v___x_2975_ == 0)
{
uint8_t v___x_2976_; 
v___x_2976_ = 5;
return v___x_2976_;
}
else
{
uint8_t v___x_2977_; 
v___x_2977_ = 4;
return v___x_2977_;
}
}
else
{
uint8_t v___x_2978_; 
v___x_2978_ = 3;
return v___x_2978_;
}
}
else
{
lean_object* v___x_2979_; uint8_t v___x_2980_; 
v___x_2979_ = lean_unsigned_to_nat(0u);
v___x_2980_ = lean_nat_dec_le(v_n_2951_, v___x_2979_);
if (v___x_2980_ == 0)
{
lean_object* v___x_2981_; uint8_t v___x_2982_; 
v___x_2981_ = lean_unsigned_to_nat(1u);
v___x_2982_ = lean_nat_dec_le(v_n_2951_, v___x_2981_);
if (v___x_2982_ == 0)
{
uint8_t v___x_2983_; 
v___x_2983_ = 2;
return v___x_2983_;
}
else
{
uint8_t v___x_2984_; 
v___x_2984_ = 1;
return v___x_2984_;
}
}
else
{
uint8_t v___x_2985_; 
v___x_2985_ = 0;
return v___x_2985_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Mismatch_ofNat___boxed(lean_object* v_n_2986_){
_start:
{
uint8_t v_res_2987_; lean_object* v_r_2988_; 
v_res_2987_ = lp_algalVerification_Algal_Replay_Mismatch_ofNat(v_n_2986_);
lean_dec(v_n_2986_);
v_r_2988_ = lean_box(v_res_2987_);
return v_r_2988_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqMismatch(uint8_t v_x_2989_, uint8_t v_y_2990_){
_start:
{
lean_object* v___x_2991_; lean_object* v___x_2992_; uint8_t v___x_2993_; 
v___x_2991_ = lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(v_x_2989_);
v___x_2992_ = lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(v_y_2990_);
v___x_2993_ = lean_nat_dec_eq(v___x_2991_, v___x_2992_);
lean_dec(v___x_2992_);
lean_dec(v___x_2991_);
return v___x_2993_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqMismatch___boxed(lean_object* v_x_2994_, lean_object* v_y_2995_){
_start:
{
uint8_t v_x_13__boxed_2996_; uint8_t v_y_14__boxed_2997_; uint8_t v_res_2998_; lean_object* v_r_2999_; 
v_x_13__boxed_2996_ = lean_unbox(v_x_2994_);
v_y_14__boxed_2997_ = lean_unbox(v_y_2995_);
v_res_2998_ = lp_algalVerification_Algal_Replay_instDecidableEqMismatch(v_x_13__boxed_2996_, v_y_14__boxed_2997_);
v_r_2999_ = lean_box(v_res_2998_);
return v_r_2999_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr(uint8_t v_x_3036_, lean_object* v_prec_3037_){
_start:
{
lean_object* v___y_3039_; lean_object* v___y_3046_; lean_object* v___y_3053_; lean_object* v___y_3060_; lean_object* v___y_3067_; lean_object* v___y_3074_; lean_object* v___y_3081_; lean_object* v___y_3088_; lean_object* v___y_3095_; lean_object* v___y_3102_; lean_object* v___y_3109_; lean_object* v___y_3116_; 
switch(v_x_3036_)
{
case 0:
{
lean_object* v___x_3122_; uint8_t v___x_3123_; 
v___x_3122_ = lean_unsigned_to_nat(1024u);
v___x_3123_ = lean_nat_dec_le(v___x_3122_, v_prec_3037_);
if (v___x_3123_ == 0)
{
lean_object* v___x_3124_; 
v___x_3124_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3039_ = v___x_3124_;
goto v___jp_3038_;
}
else
{
lean_object* v___x_3125_; 
v___x_3125_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3039_ = v___x_3125_;
goto v___jp_3038_;
}
}
case 1:
{
lean_object* v___x_3126_; uint8_t v___x_3127_; 
v___x_3126_ = lean_unsigned_to_nat(1024u);
v___x_3127_ = lean_nat_dec_le(v___x_3126_, v_prec_3037_);
if (v___x_3127_ == 0)
{
lean_object* v___x_3128_; 
v___x_3128_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3046_ = v___x_3128_;
goto v___jp_3045_;
}
else
{
lean_object* v___x_3129_; 
v___x_3129_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3046_ = v___x_3129_;
goto v___jp_3045_;
}
}
case 2:
{
lean_object* v___x_3130_; uint8_t v___x_3131_; 
v___x_3130_ = lean_unsigned_to_nat(1024u);
v___x_3131_ = lean_nat_dec_le(v___x_3130_, v_prec_3037_);
if (v___x_3131_ == 0)
{
lean_object* v___x_3132_; 
v___x_3132_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3053_ = v___x_3132_;
goto v___jp_3052_;
}
else
{
lean_object* v___x_3133_; 
v___x_3133_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3053_ = v___x_3133_;
goto v___jp_3052_;
}
}
case 3:
{
lean_object* v___x_3134_; uint8_t v___x_3135_; 
v___x_3134_ = lean_unsigned_to_nat(1024u);
v___x_3135_ = lean_nat_dec_le(v___x_3134_, v_prec_3037_);
if (v___x_3135_ == 0)
{
lean_object* v___x_3136_; 
v___x_3136_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3060_ = v___x_3136_;
goto v___jp_3059_;
}
else
{
lean_object* v___x_3137_; 
v___x_3137_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3060_ = v___x_3137_;
goto v___jp_3059_;
}
}
case 4:
{
lean_object* v___x_3138_; uint8_t v___x_3139_; 
v___x_3138_ = lean_unsigned_to_nat(1024u);
v___x_3139_ = lean_nat_dec_le(v___x_3138_, v_prec_3037_);
if (v___x_3139_ == 0)
{
lean_object* v___x_3140_; 
v___x_3140_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3067_ = v___x_3140_;
goto v___jp_3066_;
}
else
{
lean_object* v___x_3141_; 
v___x_3141_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3067_ = v___x_3141_;
goto v___jp_3066_;
}
}
case 5:
{
lean_object* v___x_3142_; uint8_t v___x_3143_; 
v___x_3142_ = lean_unsigned_to_nat(1024u);
v___x_3143_ = lean_nat_dec_le(v___x_3142_, v_prec_3037_);
if (v___x_3143_ == 0)
{
lean_object* v___x_3144_; 
v___x_3144_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3074_ = v___x_3144_;
goto v___jp_3073_;
}
else
{
lean_object* v___x_3145_; 
v___x_3145_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3074_ = v___x_3145_;
goto v___jp_3073_;
}
}
case 6:
{
lean_object* v___x_3146_; uint8_t v___x_3147_; 
v___x_3146_ = lean_unsigned_to_nat(1024u);
v___x_3147_ = lean_nat_dec_le(v___x_3146_, v_prec_3037_);
if (v___x_3147_ == 0)
{
lean_object* v___x_3148_; 
v___x_3148_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3081_ = v___x_3148_;
goto v___jp_3080_;
}
else
{
lean_object* v___x_3149_; 
v___x_3149_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3081_ = v___x_3149_;
goto v___jp_3080_;
}
}
case 7:
{
lean_object* v___x_3150_; uint8_t v___x_3151_; 
v___x_3150_ = lean_unsigned_to_nat(1024u);
v___x_3151_ = lean_nat_dec_le(v___x_3150_, v_prec_3037_);
if (v___x_3151_ == 0)
{
lean_object* v___x_3152_; 
v___x_3152_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3088_ = v___x_3152_;
goto v___jp_3087_;
}
else
{
lean_object* v___x_3153_; 
v___x_3153_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3088_ = v___x_3153_;
goto v___jp_3087_;
}
}
case 8:
{
lean_object* v___x_3154_; uint8_t v___x_3155_; 
v___x_3154_ = lean_unsigned_to_nat(1024u);
v___x_3155_ = lean_nat_dec_le(v___x_3154_, v_prec_3037_);
if (v___x_3155_ == 0)
{
lean_object* v___x_3156_; 
v___x_3156_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3095_ = v___x_3156_;
goto v___jp_3094_;
}
else
{
lean_object* v___x_3157_; 
v___x_3157_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3095_ = v___x_3157_;
goto v___jp_3094_;
}
}
case 9:
{
lean_object* v___x_3158_; uint8_t v___x_3159_; 
v___x_3158_ = lean_unsigned_to_nat(1024u);
v___x_3159_ = lean_nat_dec_le(v___x_3158_, v_prec_3037_);
if (v___x_3159_ == 0)
{
lean_object* v___x_3160_; 
v___x_3160_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3102_ = v___x_3160_;
goto v___jp_3101_;
}
else
{
lean_object* v___x_3161_; 
v___x_3161_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3102_ = v___x_3161_;
goto v___jp_3101_;
}
}
case 10:
{
lean_object* v___x_3162_; uint8_t v___x_3163_; 
v___x_3162_ = lean_unsigned_to_nat(1024u);
v___x_3163_ = lean_nat_dec_le(v___x_3162_, v_prec_3037_);
if (v___x_3163_ == 0)
{
lean_object* v___x_3164_; 
v___x_3164_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3109_ = v___x_3164_;
goto v___jp_3108_;
}
else
{
lean_object* v___x_3165_; 
v___x_3165_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3109_ = v___x_3165_;
goto v___jp_3108_;
}
}
default: 
{
lean_object* v___x_3166_; uint8_t v___x_3167_; 
v___x_3166_ = lean_unsigned_to_nat(1024u);
v___x_3167_ = lean_nat_dec_le(v___x_3166_, v_prec_3037_);
if (v___x_3167_ == 0)
{
lean_object* v___x_3168_; 
v___x_3168_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3116_ = v___x_3168_;
goto v___jp_3115_;
}
else
{
lean_object* v___x_3169_; 
v___x_3169_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3116_ = v___x_3169_;
goto v___jp_3115_;
}
}
}
v___jp_3038_:
{
lean_object* v___x_3040_; lean_object* v___x_3041_; uint8_t v___x_3042_; lean_object* v___x_3043_; lean_object* v___x_3044_; 
v___x_3040_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__1));
lean_inc(v___y_3039_);
v___x_3041_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3041_, 0, v___y_3039_);
lean_ctor_set(v___x_3041_, 1, v___x_3040_);
v___x_3042_ = 0;
v___x_3043_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3043_, 0, v___x_3041_);
lean_ctor_set_uint8(v___x_3043_, sizeof(void*)*1, v___x_3042_);
v___x_3044_ = l_Repr_addAppParen(v___x_3043_, v_prec_3037_);
return v___x_3044_;
}
v___jp_3045_:
{
lean_object* v___x_3047_; lean_object* v___x_3048_; uint8_t v___x_3049_; lean_object* v___x_3050_; lean_object* v___x_3051_; 
v___x_3047_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__3));
lean_inc(v___y_3046_);
v___x_3048_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3048_, 0, v___y_3046_);
lean_ctor_set(v___x_3048_, 1, v___x_3047_);
v___x_3049_ = 0;
v___x_3050_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3050_, 0, v___x_3048_);
lean_ctor_set_uint8(v___x_3050_, sizeof(void*)*1, v___x_3049_);
v___x_3051_ = l_Repr_addAppParen(v___x_3050_, v_prec_3037_);
return v___x_3051_;
}
v___jp_3052_:
{
lean_object* v___x_3054_; lean_object* v___x_3055_; uint8_t v___x_3056_; lean_object* v___x_3057_; lean_object* v___x_3058_; 
v___x_3054_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__5));
lean_inc(v___y_3053_);
v___x_3055_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3055_, 0, v___y_3053_);
lean_ctor_set(v___x_3055_, 1, v___x_3054_);
v___x_3056_ = 0;
v___x_3057_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3057_, 0, v___x_3055_);
lean_ctor_set_uint8(v___x_3057_, sizeof(void*)*1, v___x_3056_);
v___x_3058_ = l_Repr_addAppParen(v___x_3057_, v_prec_3037_);
return v___x_3058_;
}
v___jp_3059_:
{
lean_object* v___x_3061_; lean_object* v___x_3062_; uint8_t v___x_3063_; lean_object* v___x_3064_; lean_object* v___x_3065_; 
v___x_3061_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__7));
lean_inc(v___y_3060_);
v___x_3062_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3062_, 0, v___y_3060_);
lean_ctor_set(v___x_3062_, 1, v___x_3061_);
v___x_3063_ = 0;
v___x_3064_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3064_, 0, v___x_3062_);
lean_ctor_set_uint8(v___x_3064_, sizeof(void*)*1, v___x_3063_);
v___x_3065_ = l_Repr_addAppParen(v___x_3064_, v_prec_3037_);
return v___x_3065_;
}
v___jp_3066_:
{
lean_object* v___x_3068_; lean_object* v___x_3069_; uint8_t v___x_3070_; lean_object* v___x_3071_; lean_object* v___x_3072_; 
v___x_3068_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__9));
lean_inc(v___y_3067_);
v___x_3069_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3069_, 0, v___y_3067_);
lean_ctor_set(v___x_3069_, 1, v___x_3068_);
v___x_3070_ = 0;
v___x_3071_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3071_, 0, v___x_3069_);
lean_ctor_set_uint8(v___x_3071_, sizeof(void*)*1, v___x_3070_);
v___x_3072_ = l_Repr_addAppParen(v___x_3071_, v_prec_3037_);
return v___x_3072_;
}
v___jp_3073_:
{
lean_object* v___x_3075_; lean_object* v___x_3076_; uint8_t v___x_3077_; lean_object* v___x_3078_; lean_object* v___x_3079_; 
v___x_3075_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__11));
lean_inc(v___y_3074_);
v___x_3076_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3076_, 0, v___y_3074_);
lean_ctor_set(v___x_3076_, 1, v___x_3075_);
v___x_3077_ = 0;
v___x_3078_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3078_, 0, v___x_3076_);
lean_ctor_set_uint8(v___x_3078_, sizeof(void*)*1, v___x_3077_);
v___x_3079_ = l_Repr_addAppParen(v___x_3078_, v_prec_3037_);
return v___x_3079_;
}
v___jp_3080_:
{
lean_object* v___x_3082_; lean_object* v___x_3083_; uint8_t v___x_3084_; lean_object* v___x_3085_; lean_object* v___x_3086_; 
v___x_3082_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__13));
lean_inc(v___y_3081_);
v___x_3083_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3083_, 0, v___y_3081_);
lean_ctor_set(v___x_3083_, 1, v___x_3082_);
v___x_3084_ = 0;
v___x_3085_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3085_, 0, v___x_3083_);
lean_ctor_set_uint8(v___x_3085_, sizeof(void*)*1, v___x_3084_);
v___x_3086_ = l_Repr_addAppParen(v___x_3085_, v_prec_3037_);
return v___x_3086_;
}
v___jp_3087_:
{
lean_object* v___x_3089_; lean_object* v___x_3090_; uint8_t v___x_3091_; lean_object* v___x_3092_; lean_object* v___x_3093_; 
v___x_3089_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__15));
lean_inc(v___y_3088_);
v___x_3090_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3090_, 0, v___y_3088_);
lean_ctor_set(v___x_3090_, 1, v___x_3089_);
v___x_3091_ = 0;
v___x_3092_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3092_, 0, v___x_3090_);
lean_ctor_set_uint8(v___x_3092_, sizeof(void*)*1, v___x_3091_);
v___x_3093_ = l_Repr_addAppParen(v___x_3092_, v_prec_3037_);
return v___x_3093_;
}
v___jp_3094_:
{
lean_object* v___x_3096_; lean_object* v___x_3097_; uint8_t v___x_3098_; lean_object* v___x_3099_; lean_object* v___x_3100_; 
v___x_3096_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__17));
lean_inc(v___y_3095_);
v___x_3097_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3097_, 0, v___y_3095_);
lean_ctor_set(v___x_3097_, 1, v___x_3096_);
v___x_3098_ = 0;
v___x_3099_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3099_, 0, v___x_3097_);
lean_ctor_set_uint8(v___x_3099_, sizeof(void*)*1, v___x_3098_);
v___x_3100_ = l_Repr_addAppParen(v___x_3099_, v_prec_3037_);
return v___x_3100_;
}
v___jp_3101_:
{
lean_object* v___x_3103_; lean_object* v___x_3104_; uint8_t v___x_3105_; lean_object* v___x_3106_; lean_object* v___x_3107_; 
v___x_3103_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__19));
lean_inc(v___y_3102_);
v___x_3104_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3104_, 0, v___y_3102_);
lean_ctor_set(v___x_3104_, 1, v___x_3103_);
v___x_3105_ = 0;
v___x_3106_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3106_, 0, v___x_3104_);
lean_ctor_set_uint8(v___x_3106_, sizeof(void*)*1, v___x_3105_);
v___x_3107_ = l_Repr_addAppParen(v___x_3106_, v_prec_3037_);
return v___x_3107_;
}
v___jp_3108_:
{
lean_object* v___x_3110_; lean_object* v___x_3111_; uint8_t v___x_3112_; lean_object* v___x_3113_; lean_object* v___x_3114_; 
v___x_3110_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__21));
lean_inc(v___y_3109_);
v___x_3111_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3111_, 0, v___y_3109_);
lean_ctor_set(v___x_3111_, 1, v___x_3110_);
v___x_3112_ = 0;
v___x_3113_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3113_, 0, v___x_3111_);
lean_ctor_set_uint8(v___x_3113_, sizeof(void*)*1, v___x_3112_);
v___x_3114_ = l_Repr_addAppParen(v___x_3113_, v_prec_3037_);
return v___x_3114_;
}
v___jp_3115_:
{
lean_object* v___x_3117_; lean_object* v___x_3118_; uint8_t v___x_3119_; lean_object* v___x_3120_; lean_object* v___x_3121_; 
v___x_3117_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprMismatch_repr___closed__23));
lean_inc(v___y_3116_);
v___x_3118_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3118_, 0, v___y_3116_);
lean_ctor_set(v___x_3118_, 1, v___x_3117_);
v___x_3119_ = 0;
v___x_3120_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3120_, 0, v___x_3118_);
lean_ctor_set_uint8(v___x_3120_, sizeof(void*)*1, v___x_3119_);
v___x_3121_ = l_Repr_addAppParen(v___x_3120_, v_prec_3037_);
return v___x_3121_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprMismatch_repr___boxed(lean_object* v_x_3170_, lean_object* v_prec_3171_){
_start:
{
uint8_t v_x_677__boxed_3172_; lean_object* v_res_3173_; 
v_x_677__boxed_3172_ = lean_unbox(v_x_3170_);
v_res_3173_ = lp_algalVerification_Algal_Replay_instReprMismatch_repr(v_x_677__boxed_3172_, v_prec_3171_);
lean_dec(v_prec_3171_);
return v_res_3173_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqMismatch_beq(uint8_t v_x_3176_, uint8_t v_y_3177_){
_start:
{
lean_object* v___x_3178_; lean_object* v___x_3179_; uint8_t v___x_3180_; 
v___x_3178_ = lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(v_x_3176_);
v___x_3179_ = lp_algalVerification_Algal_Replay_Mismatch_ctorIdx(v_y_3177_);
v___x_3180_ = lean_nat_dec_eq(v___x_3178_, v___x_3179_);
lean_dec(v___x_3179_);
lean_dec(v___x_3178_);
return v___x_3180_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqMismatch_beq___boxed(lean_object* v_x_3181_, lean_object* v_y_3182_){
_start:
{
uint8_t v_x_17__boxed_3183_; uint8_t v_y_18__boxed_3184_; uint8_t v_res_3185_; lean_object* v_r_3186_; 
v_x_17__boxed_3183_ = lean_unbox(v_x_3181_);
v_y_18__boxed_3184_ = lean_unbox(v_y_3182_);
v_res_3185_ = lp_algalVerification_Algal_Replay_instBEqMismatch_beq(v_x_17__boxed_3183_, v_y_18__boxed_3184_);
v_r_3186_ = lean_box(v_res_3185_);
return v_r_3186_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_diffFields(lean_object* v_a_3229_, lean_object* v_b_3230_){
_start:
{
lean_object* v_runtime_3231_; lean_object* v_manifest_3232_; lean_object* v_manifestKey_3233_; lean_object* v_args_3234_; uint8_t v_outcome_3235_; lean_object* v_cells_3236_; lean_object* v_effects_3237_; lean_object* v_events_3238_; lean_object* v_work_3239_; lean_object* v_failure_3240_; lean_object* v_runtime_3241_; lean_object* v_manifest_3242_; lean_object* v_manifestKey_3243_; lean_object* v_args_3244_; uint8_t v_outcome_3245_; lean_object* v_cells_3246_; lean_object* v_effects_3247_; lean_object* v_events_3248_; lean_object* v_work_3249_; lean_object* v_failure_3250_; lean_object* v___y_3252_; lean_object* v___y_3253_; lean_object* v___y_3261_; lean_object* v___y_3262_; lean_object* v___y_3268_; lean_object* v___y_3269_; lean_object* v___y_3275_; lean_object* v___y_3276_; lean_object* v___y_3282_; lean_object* v___y_3283_; lean_object* v___y_3290_; lean_object* v___y_3291_; lean_object* v___y_3297_; lean_object* v___y_3298_; lean_object* v___y_3305_; lean_object* v___y_3306_; lean_object* v___y_3313_; uint8_t v___x_3318_; 
v_runtime_3231_ = lean_ctor_get(v_a_3229_, 0);
lean_inc_ref(v_runtime_3231_);
v_manifest_3232_ = lean_ctor_get(v_a_3229_, 1);
lean_inc_ref(v_manifest_3232_);
v_manifestKey_3233_ = lean_ctor_get(v_a_3229_, 2);
lean_inc_ref(v_manifestKey_3233_);
v_args_3234_ = lean_ctor_get(v_a_3229_, 3);
lean_inc(v_args_3234_);
v_outcome_3235_ = lean_ctor_get_uint8(v_a_3229_, sizeof(void*)*9);
v_cells_3236_ = lean_ctor_get(v_a_3229_, 4);
lean_inc(v_cells_3236_);
v_effects_3237_ = lean_ctor_get(v_a_3229_, 5);
lean_inc(v_effects_3237_);
v_events_3238_ = lean_ctor_get(v_a_3229_, 6);
lean_inc(v_events_3238_);
v_work_3239_ = lean_ctor_get(v_a_3229_, 7);
lean_inc_ref(v_work_3239_);
v_failure_3240_ = lean_ctor_get(v_a_3229_, 8);
lean_inc(v_failure_3240_);
lean_dec_ref(v_a_3229_);
v_runtime_3241_ = lean_ctor_get(v_b_3230_, 0);
lean_inc_ref(v_runtime_3241_);
v_manifest_3242_ = lean_ctor_get(v_b_3230_, 1);
lean_inc_ref(v_manifest_3242_);
v_manifestKey_3243_ = lean_ctor_get(v_b_3230_, 2);
lean_inc_ref(v_manifestKey_3243_);
v_args_3244_ = lean_ctor_get(v_b_3230_, 3);
lean_inc(v_args_3244_);
v_outcome_3245_ = lean_ctor_get_uint8(v_b_3230_, sizeof(void*)*9);
v_cells_3246_ = lean_ctor_get(v_b_3230_, 4);
lean_inc(v_cells_3246_);
v_effects_3247_ = lean_ctor_get(v_b_3230_, 5);
lean_inc(v_effects_3247_);
v_events_3248_ = lean_ctor_get(v_b_3230_, 6);
lean_inc(v_events_3248_);
v_work_3249_ = lean_ctor_get(v_b_3230_, 7);
lean_inc_ref(v_work_3249_);
v_failure_3250_ = lean_ctor_get(v_b_3230_, 8);
lean_inc(v_failure_3250_);
lean_dec_ref(v_b_3230_);
v___x_3318_ = lp_algalVerification_Algal_Replay_instDecidableEqOutcome(v_outcome_3235_, v_outcome_3245_);
if (v___x_3318_ == 0)
{
lean_object* v___x_3319_; 
v___x_3319_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__9));
v___y_3313_ = v___x_3319_;
goto v___jp_3312_;
}
else
{
lean_object* v___x_3320_; 
v___x_3320_ = lean_box(0);
v___y_3313_ = v___x_3320_;
goto v___jp_3312_;
}
v___jp_3251_:
{
lean_object* v___x_3254_; uint8_t v___x_3255_; 
lean_inc(v___y_3253_);
v___x_3254_ = l_List_appendTR___redArg(v___y_3252_, v___y_3253_);
v___x_3255_ = lean_string_dec_eq(v_manifest_3232_, v_manifest_3242_);
lean_dec_ref(v_manifest_3242_);
lean_dec_ref(v_manifest_3232_);
if (v___x_3255_ == 0)
{
lean_object* v___x_3256_; lean_object* v___x_3257_; 
v___x_3256_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__0));
v___x_3257_ = l_List_appendTR___redArg(v___x_3254_, v___x_3256_);
return v___x_3257_;
}
else
{
lean_object* v___x_3258_; lean_object* v___x_3259_; 
v___x_3258_ = lean_box(0);
v___x_3259_ = l_List_appendTR___redArg(v___x_3254_, v___x_3258_);
return v___x_3259_;
}
}
v___jp_3260_:
{
lean_object* v___x_3263_; uint8_t v___x_3264_; 
lean_inc(v___y_3262_);
v___x_3263_ = l_List_appendTR___redArg(v___y_3261_, v___y_3262_);
v___x_3264_ = lean_string_dec_eq(v_manifestKey_3233_, v_manifestKey_3243_);
lean_dec_ref(v_manifestKey_3243_);
lean_dec_ref(v_manifestKey_3233_);
if (v___x_3264_ == 0)
{
lean_object* v___x_3265_; 
v___x_3265_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__1));
v___y_3252_ = v___x_3263_;
v___y_3253_ = v___x_3265_;
goto v___jp_3251_;
}
else
{
lean_object* v___x_3266_; 
v___x_3266_ = lean_box(0);
v___y_3252_ = v___x_3263_;
v___y_3253_ = v___x_3266_;
goto v___jp_3251_;
}
}
v___jp_3267_:
{
lean_object* v___x_3270_; uint8_t v___x_3271_; 
lean_inc(v___y_3269_);
v___x_3270_ = l_List_appendTR___redArg(v___y_3268_, v___y_3269_);
v___x_3271_ = lp_algalVerification_Algal_Replay_instDecidableEqStamp_decEq(v_runtime_3231_, v_runtime_3241_);
lean_dec_ref(v_runtime_3241_);
lean_dec_ref(v_runtime_3231_);
if (v___x_3271_ == 0)
{
lean_object* v___x_3272_; 
v___x_3272_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__2));
v___y_3261_ = v___x_3270_;
v___y_3262_ = v___x_3272_;
goto v___jp_3260_;
}
else
{
lean_object* v___x_3273_; 
v___x_3273_ = lean_box(0);
v___y_3261_ = v___x_3270_;
v___y_3262_ = v___x_3273_;
goto v___jp_3260_;
}
}
v___jp_3274_:
{
lean_object* v___x_3277_; uint8_t v___x_3278_; 
lean_inc(v___y_3276_);
v___x_3277_ = l_List_appendTR___redArg(v___y_3275_, v___y_3276_);
v___x_3278_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_args_3234_, v_args_3244_);
lean_dec(v_args_3244_);
lean_dec(v_args_3234_);
if (v___x_3278_ == 0)
{
lean_object* v___x_3279_; 
v___x_3279_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__3));
v___y_3268_ = v___x_3277_;
v___y_3269_ = v___x_3279_;
goto v___jp_3267_;
}
else
{
lean_object* v___x_3280_; 
v___x_3280_ = lean_box(0);
v___y_3268_ = v___x_3277_;
v___y_3269_ = v___x_3280_;
goto v___jp_3267_;
}
}
v___jp_3281_:
{
lean_object* v___x_3284_; lean_object* v___x_3285_; uint8_t v___x_3286_; 
lean_inc(v___y_3283_);
v___x_3284_ = l_List_appendTR___redArg(v___y_3282_, v___y_3283_);
v___x_3285_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqErrorCode___boxed), 2, 0);
v___x_3286_ = l_Option_instDecidableEq___redArg(v___x_3285_, v_failure_3240_, v_failure_3250_);
if (v___x_3286_ == 0)
{
lean_object* v___x_3287_; 
v___x_3287_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__4));
v___y_3275_ = v___x_3284_;
v___y_3276_ = v___x_3287_;
goto v___jp_3274_;
}
else
{
lean_object* v___x_3288_; 
v___x_3288_ = lean_box(0);
v___y_3275_ = v___x_3284_;
v___y_3276_ = v___x_3288_;
goto v___jp_3274_;
}
}
v___jp_3289_:
{
lean_object* v___x_3292_; uint8_t v___x_3293_; 
lean_inc(v___y_3291_);
v___x_3292_ = l_List_appendTR___redArg(v___y_3290_, v___y_3291_);
v___x_3293_ = lp_algalVerification_Algal_Replay_instDecidableEqWork_decEq(v_work_3239_, v_work_3249_);
lean_dec_ref(v_work_3249_);
lean_dec_ref(v_work_3239_);
if (v___x_3293_ == 0)
{
lean_object* v___x_3294_; 
v___x_3294_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__5));
v___y_3282_ = v___x_3292_;
v___y_3283_ = v___x_3294_;
goto v___jp_3281_;
}
else
{
lean_object* v___x_3295_; 
v___x_3295_ = lean_box(0);
v___y_3282_ = v___x_3292_;
v___y_3283_ = v___x_3295_;
goto v___jp_3281_;
}
}
v___jp_3296_:
{
lean_object* v___x_3299_; lean_object* v___x_3300_; uint8_t v___x_3301_; 
lean_inc(v___y_3298_);
v___x_3299_ = l_List_appendTR___redArg(v___y_3297_, v___y_3298_);
v___x_3300_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEvent___boxed), 2, 0);
v___x_3301_ = l_instDecidableEqList___redArg(v___x_3300_, v_events_3238_, v_events_3248_);
if (v___x_3301_ == 0)
{
lean_object* v___x_3302_; 
v___x_3302_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__6));
v___y_3290_ = v___x_3299_;
v___y_3291_ = v___x_3302_;
goto v___jp_3289_;
}
else
{
lean_object* v___x_3303_; 
v___x_3303_ = lean_box(0);
v___y_3290_ = v___x_3299_;
v___y_3291_ = v___x_3303_;
goto v___jp_3289_;
}
}
v___jp_3304_:
{
lean_object* v___x_3307_; lean_object* v___x_3308_; uint8_t v___x_3309_; 
lean_inc(v___y_3306_);
lean_inc(v___y_3305_);
v___x_3307_ = l_List_appendTR___redArg(v___y_3305_, v___y_3306_);
v___x_3308_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqEffectRecord___boxed), 2, 0);
v___x_3309_ = l_instDecidableEqList___redArg(v___x_3308_, v_effects_3237_, v_effects_3247_);
if (v___x_3309_ == 0)
{
lean_object* v___x_3310_; 
v___x_3310_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__7));
v___y_3297_ = v___x_3307_;
v___y_3298_ = v___x_3310_;
goto v___jp_3296_;
}
else
{
lean_object* v___x_3311_; 
v___x_3311_ = lean_box(0);
v___y_3297_ = v___x_3307_;
v___y_3298_ = v___x_3311_;
goto v___jp_3296_;
}
}
v___jp_3312_:
{
lean_object* v___x_3314_; uint8_t v___x_3315_; 
v___x_3314_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqCellRecord___boxed), 2, 0);
v___x_3315_ = l_instDecidableEqList___redArg(v___x_3314_, v_cells_3236_, v_cells_3246_);
if (v___x_3315_ == 0)
{
lean_object* v___x_3316_; 
v___x_3316_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffFields___closed__8));
v___y_3305_ = v___y_3313_;
v___y_3306_ = v___x_3316_;
goto v___jp_3304_;
}
else
{
lean_object* v___x_3317_; 
v___x_3317_ = lean_box(0);
v___y_3305_ = v___y_3313_;
v___y_3306_ = v___x_3317_;
goto v___jp_3304_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_diffReceipts(lean_object* v_a_3325_, lean_object* v_b_3326_){
_start:
{
lean_object* v_fields_3327_; lean_object* v_digest_3328_; lean_object* v_fields_3329_; lean_object* v_digest_3330_; lean_object* v_named_3331_; uint8_t v___x_3332_; 
v_fields_3327_ = lean_ctor_get(v_a_3325_, 0);
lean_inc_ref(v_fields_3327_);
v_digest_3328_ = lean_ctor_get(v_a_3325_, 1);
lean_inc_ref(v_digest_3328_);
lean_dec_ref(v_a_3325_);
v_fields_3329_ = lean_ctor_get(v_b_3326_, 0);
lean_inc_ref(v_fields_3329_);
v_digest_3330_ = lean_ctor_get(v_b_3326_, 1);
lean_inc_ref(v_digest_3330_);
lean_dec_ref(v_b_3326_);
v_named_3331_ = lp_algalVerification_Algal_Replay_diffFields(v_fields_3327_, v_fields_3329_);
v___x_3332_ = l_List_isEmpty___redArg(v_named_3331_);
if (v___x_3332_ == 0)
{
lean_dec_ref(v_digest_3330_);
lean_dec_ref(v_digest_3328_);
return v_named_3331_;
}
else
{
uint8_t v___x_3333_; 
lean_dec(v_named_3331_);
v___x_3333_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_digest_3328_, v_digest_3330_);
if (v___x_3333_ == 0)
{
lean_object* v___x_3334_; 
v___x_3334_ = ((lean_object*)(lp_algalVerification_Algal_Replay_diffReceipts___closed__0));
return v___x_3334_;
}
else
{
lean_object* v___x_3335_; 
v___x_3335_ = lean_box(0);
return v___x_3335_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorIdx(lean_object* v_x_3336_){
_start:
{
switch(lean_obj_tag(v_x_3336_))
{
case 0:
{
lean_object* v___x_3337_; 
v___x_3337_ = lean_unsigned_to_nat(0u);
return v___x_3337_;
}
case 1:
{
lean_object* v___x_3338_; 
v___x_3338_ = lean_unsigned_to_nat(1u);
return v___x_3338_;
}
default: 
{
lean_object* v___x_3339_; 
v___x_3339_ = lean_unsigned_to_nat(2u);
return v___x_3339_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorIdx___boxed(lean_object* v_x_3340_){
_start:
{
lean_object* v_res_3341_; 
v_res_3341_ = lp_algalVerification_Algal_Replay_Verdict_ctorIdx(v_x_3340_);
lean_dec(v_x_3340_);
return v_res_3341_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(lean_object* v_t_3342_, lean_object* v_k_3343_){
_start:
{
switch(lean_obj_tag(v_t_3342_))
{
case 0:
{
return v_k_3343_;
}
case 1:
{
lean_object* v_a_3344_; lean_object* v___x_3345_; 
v_a_3344_ = lean_ctor_get(v_t_3342_, 0);
lean_inc(v_a_3344_);
lean_dec_ref_known(v_t_3342_, 1);
v___x_3345_ = lean_apply_1(v_k_3343_, v_a_3344_);
return v___x_3345_;
}
default: 
{
uint8_t v_a_3346_; lean_object* v___x_3347_; lean_object* v___x_3348_; 
v_a_3346_ = lean_ctor_get_uint8(v_t_3342_, 0);
lean_dec_ref_known(v_t_3342_, 0);
v___x_3347_ = lean_box(v_a_3346_);
v___x_3348_ = lean_apply_1(v_k_3343_, v___x_3347_);
return v___x_3348_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim(lean_object* v_motive_3349_, lean_object* v_ctorIdx_3350_, lean_object* v_t_3351_, lean_object* v_h_3352_, lean_object* v_k_3353_){
_start:
{
lean_object* v___x_3354_; 
v___x_3354_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3351_, v_k_3353_);
return v___x_3354_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_ctorElim___boxed(lean_object* v_motive_3355_, lean_object* v_ctorIdx_3356_, lean_object* v_t_3357_, lean_object* v_h_3358_, lean_object* v_k_3359_){
_start:
{
lean_object* v_res_3360_; 
v_res_3360_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim(v_motive_3355_, v_ctorIdx_3356_, v_t_3357_, v_h_3358_, v_k_3359_);
lean_dec(v_ctorIdx_3356_);
return v_res_3360_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_verified_elim___redArg(lean_object* v_t_3361_, lean_object* v_verified_3362_){
_start:
{
lean_object* v___x_3363_; 
v___x_3363_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3361_, v_verified_3362_);
return v___x_3363_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_verified_elim(lean_object* v_motive_3364_, lean_object* v_t_3365_, lean_object* v_h_3366_, lean_object* v_verified_3367_){
_start:
{
lean_object* v___x_3368_; 
v___x_3368_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3365_, v_verified_3367_);
return v___x_3368_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_mismatch_elim___redArg(lean_object* v_t_3369_, lean_object* v_mismatch_3370_){
_start:
{
lean_object* v___x_3371_; 
v___x_3371_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3369_, v_mismatch_3370_);
return v___x_3371_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_mismatch_elim(lean_object* v_motive_3372_, lean_object* v_t_3373_, lean_object* v_h_3374_, lean_object* v_mismatch_3375_){
_start:
{
lean_object* v___x_3376_; 
v___x_3376_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3373_, v_mismatch_3375_);
return v___x_3376_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_rejected_elim___redArg(lean_object* v_t_3377_, lean_object* v_rejected_3378_){
_start:
{
lean_object* v___x_3379_; 
v___x_3379_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3377_, v_rejected_3378_);
return v___x_3379_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_Verdict_rejected_elim(lean_object* v_motive_3380_, lean_object* v_t_3381_, lean_object* v_h_3382_, lean_object* v_rejected_3383_){
_start:
{
lean_object* v___x_3384_; 
v___x_3384_ = lp_algalVerification_Algal_Replay_Verdict_ctorElim___redArg(v_t_3381_, v_rejected_3383_);
return v___x_3384_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq(lean_object* v_x_3385_, lean_object* v_x_3386_){
_start:
{
switch(lean_obj_tag(v_x_3385_))
{
case 0:
{
if (lean_obj_tag(v_x_3386_) == 0)
{
uint8_t v___x_3387_; 
v___x_3387_ = 1;
return v___x_3387_;
}
else
{
uint8_t v___x_3388_; 
lean_dec(v_x_3386_);
v___x_3388_ = 0;
return v___x_3388_;
}
}
case 1:
{
lean_object* v_a_3389_; uint8_t v___x_3390_; 
v_a_3389_ = lean_ctor_get(v_x_3385_, 0);
lean_inc(v_a_3389_);
lean_dec_ref_known(v_x_3385_, 1);
v___x_3390_ = 0;
if (lean_obj_tag(v_x_3386_) == 1)
{
lean_object* v_a_3391_; lean_object* v___x_3392_; uint8_t v___x_3393_; 
v_a_3391_ = lean_ctor_get(v_x_3386_, 0);
lean_inc(v_a_3391_);
lean_dec_ref_known(v_x_3386_, 1);
v___x_3392_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_instDecidableEqMismatch___boxed), 2, 0);
v___x_3393_ = l_instDecidableEqList___redArg(v___x_3392_, v_a_3389_, v_a_3391_);
if (v___x_3393_ == 0)
{
return v___x_3390_;
}
else
{
return v___x_3393_;
}
}
else
{
lean_dec(v_a_3389_);
lean_dec(v_x_3386_);
return v___x_3390_;
}
}
default: 
{
uint8_t v_a_3394_; uint8_t v___x_3395_; 
v_a_3394_ = lean_ctor_get_uint8(v_x_3385_, 0);
lean_dec_ref_known(v_x_3385_, 0);
v___x_3395_ = 0;
if (lean_obj_tag(v_x_3386_) == 2)
{
uint8_t v_a_3396_; uint8_t v___x_3397_; 
v_a_3396_ = lean_ctor_get_uint8(v_x_3386_, 0);
lean_dec_ref_known(v_x_3386_, 0);
v___x_3397_ = lp_algalVerification_Algal_Replay_instDecidableEqErrorCode(v_a_3394_, v_a_3396_);
if (v___x_3397_ == 0)
{
return v___x_3395_;
}
else
{
return v___x_3397_;
}
}
else
{
lean_dec(v_x_3386_);
return v___x_3395_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq___boxed(lean_object* v_x_3398_, lean_object* v_x_3399_){
_start:
{
uint8_t v_res_3400_; lean_object* v_r_3401_; 
v_res_3400_ = lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq(v_x_3398_, v_x_3399_);
v_r_3401_ = lean_box(v_res_3400_);
return v_r_3401_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instDecidableEqVerdict(lean_object* v_x_3402_, lean_object* v_x_3403_){
_start:
{
uint8_t v___x_3404_; 
v___x_3404_ = lp_algalVerification_Algal_Replay_instDecidableEqVerdict_decEq(v_x_3402_, v_x_3403_);
return v___x_3404_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instDecidableEqVerdict___boxed(lean_object* v_x_3405_, lean_object* v_x_3406_){
_start:
{
uint8_t v_res_3407_; lean_object* v_r_3408_; 
v_res_3407_ = lp_algalVerification_Algal_Replay_instDecidableEqVerdict(v_x_3405_, v_x_3406_);
v_r_3408_ = lean_box(v_res_3407_);
return v_r_3408_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1_spec__2(lean_object* v_x_3409_, lean_object* v_x_3410_, lean_object* v_x_3411_){
_start:
{
if (lean_obj_tag(v_x_3411_) == 0)
{
lean_dec(v_x_3409_);
return v_x_3410_;
}
else
{
lean_object* v_head_3412_; lean_object* v_tail_3413_; lean_object* v___x_3415_; uint8_t v_isShared_3416_; uint8_t v_isSharedCheck_3425_; 
v_head_3412_ = lean_ctor_get(v_x_3411_, 0);
v_tail_3413_ = lean_ctor_get(v_x_3411_, 1);
v_isSharedCheck_3425_ = !lean_is_exclusive(v_x_3411_);
if (v_isSharedCheck_3425_ == 0)
{
v___x_3415_ = v_x_3411_;
v_isShared_3416_ = v_isSharedCheck_3425_;
goto v_resetjp_3414_;
}
else
{
lean_inc(v_tail_3413_);
lean_inc(v_head_3412_);
lean_dec(v_x_3411_);
v___x_3415_ = lean_box(0);
v_isShared_3416_ = v_isSharedCheck_3425_;
goto v_resetjp_3414_;
}
v_resetjp_3414_:
{
lean_object* v___x_3418_; 
lean_inc(v_x_3409_);
if (v_isShared_3416_ == 0)
{
lean_ctor_set_tag(v___x_3415_, 5);
lean_ctor_set(v___x_3415_, 1, v_x_3409_);
lean_ctor_set(v___x_3415_, 0, v_x_3410_);
v___x_3418_ = v___x_3415_;
goto v_reusejp_3417_;
}
else
{
lean_object* v_reuseFailAlloc_3424_; 
v_reuseFailAlloc_3424_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_3424_, 0, v_x_3410_);
lean_ctor_set(v_reuseFailAlloc_3424_, 1, v_x_3409_);
v___x_3418_ = v_reuseFailAlloc_3424_;
goto v_reusejp_3417_;
}
v_reusejp_3417_:
{
lean_object* v___x_3419_; uint8_t v___x_3420_; lean_object* v___x_3421_; lean_object* v___x_3422_; 
v___x_3419_ = lean_unsigned_to_nat(0u);
v___x_3420_ = lean_unbox(v_head_3412_);
lean_dec(v_head_3412_);
v___x_3421_ = lp_algalVerification_Algal_Replay_instReprMismatch_repr(v___x_3420_, v___x_3419_);
v___x_3422_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3422_, 0, v___x_3418_);
lean_ctor_set(v___x_3422_, 1, v___x_3421_);
v_x_3410_ = v___x_3422_;
v_x_3411_ = v_tail_3413_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1(lean_object* v_x_3426_, lean_object* v_x_3427_, lean_object* v_x_3428_){
_start:
{
if (lean_obj_tag(v_x_3428_) == 0)
{
lean_dec(v_x_3426_);
return v_x_3427_;
}
else
{
lean_object* v_head_3429_; lean_object* v_tail_3430_; lean_object* v___x_3432_; uint8_t v_isShared_3433_; uint8_t v_isSharedCheck_3442_; 
v_head_3429_ = lean_ctor_get(v_x_3428_, 0);
v_tail_3430_ = lean_ctor_get(v_x_3428_, 1);
v_isSharedCheck_3442_ = !lean_is_exclusive(v_x_3428_);
if (v_isSharedCheck_3442_ == 0)
{
v___x_3432_ = v_x_3428_;
v_isShared_3433_ = v_isSharedCheck_3442_;
goto v_resetjp_3431_;
}
else
{
lean_inc(v_tail_3430_);
lean_inc(v_head_3429_);
lean_dec(v_x_3428_);
v___x_3432_ = lean_box(0);
v_isShared_3433_ = v_isSharedCheck_3442_;
goto v_resetjp_3431_;
}
v_resetjp_3431_:
{
lean_object* v___x_3435_; 
lean_inc(v_x_3426_);
if (v_isShared_3433_ == 0)
{
lean_ctor_set_tag(v___x_3432_, 5);
lean_ctor_set(v___x_3432_, 1, v_x_3426_);
lean_ctor_set(v___x_3432_, 0, v_x_3427_);
v___x_3435_ = v___x_3432_;
goto v_reusejp_3434_;
}
else
{
lean_object* v_reuseFailAlloc_3441_; 
v_reuseFailAlloc_3441_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v_reuseFailAlloc_3441_, 0, v_x_3427_);
lean_ctor_set(v_reuseFailAlloc_3441_, 1, v_x_3426_);
v___x_3435_ = v_reuseFailAlloc_3441_;
goto v_reusejp_3434_;
}
v_reusejp_3434_:
{
lean_object* v___x_3436_; uint8_t v___x_3437_; lean_object* v___x_3438_; lean_object* v___x_3439_; lean_object* v___x_3440_; 
v___x_3436_ = lean_unsigned_to_nat(0u);
v___x_3437_ = lean_unbox(v_head_3429_);
lean_dec(v_head_3429_);
v___x_3438_ = lp_algalVerification_Algal_Replay_instReprMismatch_repr(v___x_3437_, v___x_3436_);
v___x_3439_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3439_, 0, v___x_3435_);
lean_ctor_set(v___x_3439_, 1, v___x_3438_);
v___x_3440_ = lp_algalVerification_List_foldl___at___00List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1_spec__2(v_x_3426_, v___x_3439_, v_tail_3430_);
return v___x_3440_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0(uint8_t v___y_3443_){
_start:
{
lean_object* v___x_3444_; lean_object* v___x_3445_; 
v___x_3444_ = lean_unsigned_to_nat(0u);
v___x_3445_ = lp_algalVerification_Algal_Replay_instReprMismatch_repr(v___y_3443_, v___x_3444_);
return v___x_3445_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0___boxed(lean_object* v___y_3446_){
_start:
{
uint8_t v___y_439__boxed_3447_; lean_object* v_res_3448_; 
v___y_439__boxed_3447_ = lean_unbox(v___y_3446_);
v_res_3448_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0(v___y_439__boxed_3447_);
return v_res_3448_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0(lean_object* v_x_3449_, lean_object* v_x_3450_){
_start:
{
if (lean_obj_tag(v_x_3449_) == 0)
{
lean_object* v___x_3451_; 
lean_dec(v_x_3450_);
v___x_3451_ = lean_box(0);
return v___x_3451_;
}
else
{
lean_object* v_tail_3452_; 
v_tail_3452_ = lean_ctor_get(v_x_3449_, 1);
if (lean_obj_tag(v_tail_3452_) == 0)
{
lean_object* v_head_3453_; uint8_t v___x_3454_; lean_object* v___x_3455_; 
lean_dec(v_x_3450_);
v_head_3453_ = lean_ctor_get(v_x_3449_, 0);
lean_inc(v_head_3453_);
lean_dec_ref_known(v_x_3449_, 2);
v___x_3454_ = lean_unbox(v_head_3453_);
lean_dec(v_head_3453_);
v___x_3455_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0(v___x_3454_);
return v___x_3455_;
}
else
{
lean_object* v_head_3456_; uint8_t v___x_3457_; lean_object* v___x_3458_; lean_object* v___x_3459_; 
lean_inc(v_tail_3452_);
v_head_3456_ = lean_ctor_get(v_x_3449_, 0);
lean_inc(v_head_3456_);
lean_dec_ref_known(v_x_3449_, 2);
v___x_3457_ = lean_unbox(v_head_3456_);
lean_dec(v_head_3456_);
v___x_3458_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0___lam__0(v___x_3457_);
v___x_3459_ = lp_algalVerification_List_foldl___at___00Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0_spec__1(v_x_3450_, v___x_3458_, v_tail_3452_);
return v___x_3459_;
}
}
}
}
static lean_object* _init_lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5(void){
_start:
{
lean_object* v___x_3468_; lean_object* v___x_3469_; 
v___x_3468_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__2));
v___x_3469_ = lean_string_length(v___x_3468_);
return v___x_3469_;
}
}
static lean_object* _init_lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6(void){
_start:
{
lean_object* v___x_3470_; lean_object* v___x_3471_; 
v___x_3470_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5, &lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5_once, _init_lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__5);
v___x_3471_ = lean_nat_to_int(v___x_3470_);
return v___x_3471_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg(lean_object* v_a_3476_){
_start:
{
if (lean_obj_tag(v_a_3476_) == 0)
{
lean_object* v___x_3477_; 
v___x_3477_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__1));
return v___x_3477_;
}
else
{
lean_object* v___x_3478_; lean_object* v___x_3479_; lean_object* v___x_3480_; lean_object* v___x_3481_; lean_object* v___x_3482_; lean_object* v___x_3483_; lean_object* v___x_3484_; lean_object* v___x_3485_; uint8_t v___x_3486_; lean_object* v___x_3487_; 
v___x_3478_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__3));
v___x_3479_ = lp_algalVerification_Std_Format_joinSep___at___00List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0_spec__0(v_a_3476_, v___x_3478_);
v___x_3480_ = lean_obj_once(&lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6, &lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6_once, _init_lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__6);
v___x_3481_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__7));
v___x_3482_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3482_, 0, v___x_3481_);
lean_ctor_set(v___x_3482_, 1, v___x_3479_);
v___x_3483_ = ((lean_object*)(lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg___closed__8));
v___x_3484_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3484_, 0, v___x_3482_);
lean_ctor_set(v___x_3484_, 1, v___x_3483_);
v___x_3485_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3485_, 0, v___x_3480_);
lean_ctor_set(v___x_3485_, 1, v___x_3484_);
v___x_3486_ = 0;
v___x_3487_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3487_, 0, v___x_3485_);
lean_ctor_set_uint8(v___x_3487_, sizeof(void*)*1, v___x_3486_);
return v___x_3487_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr(lean_object* v_x_3503_, lean_object* v_prec_3504_){
_start:
{
lean_object* v___y_3506_; 
switch(lean_obj_tag(v_x_3503_))
{
case 0:
{
lean_object* v___x_3512_; uint8_t v___x_3513_; 
v___x_3512_ = lean_unsigned_to_nat(1024u);
v___x_3513_ = lean_nat_dec_le(v___x_3512_, v_prec_3504_);
if (v___x_3513_ == 0)
{
lean_object* v___x_3514_; 
v___x_3514_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3506_ = v___x_3514_;
goto v___jp_3505_;
}
else
{
lean_object* v___x_3515_; 
v___x_3515_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3506_ = v___x_3515_;
goto v___jp_3505_;
}
}
case 1:
{
lean_object* v_a_3516_; lean_object* v___y_3518_; lean_object* v___x_3526_; uint8_t v___x_3527_; 
v_a_3516_ = lean_ctor_get(v_x_3503_, 0);
lean_inc(v_a_3516_);
lean_dec_ref_known(v_x_3503_, 1);
v___x_3526_ = lean_unsigned_to_nat(1024u);
v___x_3527_ = lean_nat_dec_le(v___x_3526_, v_prec_3504_);
if (v___x_3527_ == 0)
{
lean_object* v___x_3528_; 
v___x_3528_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3518_ = v___x_3528_;
goto v___jp_3517_;
}
else
{
lean_object* v___x_3529_; 
v___x_3529_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3518_ = v___x_3529_;
goto v___jp_3517_;
}
v___jp_3517_:
{
lean_object* v___x_3519_; lean_object* v___x_3520_; lean_object* v___x_3521_; lean_object* v___x_3522_; uint8_t v___x_3523_; lean_object* v___x_3524_; lean_object* v___x_3525_; 
v___x_3519_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__4));
v___x_3520_ = lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg(v_a_3516_);
v___x_3521_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3521_, 0, v___x_3519_);
lean_ctor_set(v___x_3521_, 1, v___x_3520_);
lean_inc(v___y_3518_);
v___x_3522_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3522_, 0, v___y_3518_);
lean_ctor_set(v___x_3522_, 1, v___x_3521_);
v___x_3523_ = 0;
v___x_3524_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3524_, 0, v___x_3522_);
lean_ctor_set_uint8(v___x_3524_, sizeof(void*)*1, v___x_3523_);
v___x_3525_ = l_Repr_addAppParen(v___x_3524_, v_prec_3504_);
return v___x_3525_;
}
}
default: 
{
uint8_t v_a_3530_; lean_object* v___y_3532_; lean_object* v___x_3541_; uint8_t v___x_3542_; 
v_a_3530_ = lean_ctor_get_uint8(v_x_3503_, 0);
lean_dec_ref_known(v_x_3503_, 0);
v___x_3541_ = lean_unsigned_to_nat(1024u);
v___x_3542_ = lean_nat_dec_le(v___x_3541_, v_prec_3504_);
if (v___x_3542_ == 0)
{
lean_object* v___x_3543_; 
v___x_3543_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__12);
v___y_3532_ = v___x_3543_;
goto v___jp_3531_;
}
else
{
lean_object* v___x_3544_; 
v___x_3544_ = lean_obj_once(&lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13, &lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13_once, _init_lp_algalVerification_Algal_Replay_instReprKind_repr___closed__13);
v___y_3532_ = v___x_3544_;
goto v___jp_3531_;
}
v___jp_3531_:
{
lean_object* v___x_3533_; lean_object* v___x_3534_; lean_object* v___x_3535_; lean_object* v___x_3536_; lean_object* v___x_3537_; uint8_t v___x_3538_; lean_object* v___x_3539_; lean_object* v___x_3540_; 
v___x_3533_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__7));
v___x_3534_ = lean_unsigned_to_nat(1024u);
v___x_3535_ = lp_algalVerification_Algal_Replay_instReprErrorCode_repr(v_a_3530_, v___x_3534_);
v___x_3536_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_3536_, 0, v___x_3533_);
lean_ctor_set(v___x_3536_, 1, v___x_3535_);
lean_inc(v___y_3532_);
v___x_3537_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3537_, 0, v___y_3532_);
lean_ctor_set(v___x_3537_, 1, v___x_3536_);
v___x_3538_ = 0;
v___x_3539_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3539_, 0, v___x_3537_);
lean_ctor_set_uint8(v___x_3539_, sizeof(void*)*1, v___x_3538_);
v___x_3540_ = l_Repr_addAppParen(v___x_3539_, v_prec_3504_);
return v___x_3540_;
}
}
}
v___jp_3505_:
{
lean_object* v___x_3507_; lean_object* v___x_3508_; uint8_t v___x_3509_; lean_object* v___x_3510_; lean_object* v___x_3511_; 
v___x_3507_ = ((lean_object*)(lp_algalVerification_Algal_Replay_instReprVerdict_repr___closed__1));
lean_inc(v___y_3506_);
v___x_3508_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_3508_, 0, v___y_3506_);
lean_ctor_set(v___x_3508_, 1, v___x_3507_);
v___x_3509_ = 0;
v___x_3510_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_3510_, 0, v___x_3508_);
lean_ctor_set_uint8(v___x_3510_, sizeof(void*)*1, v___x_3509_);
v___x_3511_ = l_Repr_addAppParen(v___x_3510_, v_prec_3504_);
return v___x_3511_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instReprVerdict_repr___boxed(lean_object* v_x_3545_, lean_object* v_prec_3546_){
_start:
{
lean_object* v_res_3547_; 
v_res_3547_ = lp_algalVerification_Algal_Replay_instReprVerdict_repr(v_x_3545_, v_prec_3546_);
lean_dec(v_prec_3546_);
return v_res_3547_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0(lean_object* v_a_3548_, lean_object* v_n_3549_){
_start:
{
lean_object* v___x_3550_; 
v___x_3550_ = lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___redArg(v_a_3548_);
return v___x_3550_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0___boxed(lean_object* v_a_3551_, lean_object* v_n_3552_){
_start:
{
lean_object* v_res_3553_; 
v_res_3553_ = lp_algalVerification_List_repr___at___00Algal_Replay_instReprVerdict_repr_spec__0(v_a_3551_, v_n_3552_);
lean_dec(v_n_3552_);
return v_res_3553_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0(lean_object* v_x_3556_, lean_object* v_x_3557_){
_start:
{
if (lean_obj_tag(v_x_3556_) == 0)
{
if (lean_obj_tag(v_x_3557_) == 0)
{
uint8_t v___x_3558_; 
v___x_3558_ = 1;
return v___x_3558_;
}
else
{
uint8_t v___x_3559_; 
v___x_3559_ = 0;
return v___x_3559_;
}
}
else
{
if (lean_obj_tag(v_x_3557_) == 0)
{
uint8_t v___x_3560_; 
v___x_3560_ = 0;
return v___x_3560_;
}
else
{
lean_object* v_head_3561_; lean_object* v_tail_3562_; lean_object* v_head_3563_; lean_object* v_tail_3564_; uint8_t v___x_3565_; uint8_t v___x_3566_; uint8_t v___x_3567_; 
v_head_3561_ = lean_ctor_get(v_x_3556_, 0);
v_tail_3562_ = lean_ctor_get(v_x_3556_, 1);
v_head_3563_ = lean_ctor_get(v_x_3557_, 0);
v_tail_3564_ = lean_ctor_get(v_x_3557_, 1);
v___x_3565_ = lean_unbox(v_head_3561_);
v___x_3566_ = lean_unbox(v_head_3563_);
v___x_3567_ = lp_algalVerification_Algal_Replay_instBEqMismatch_beq(v___x_3565_, v___x_3566_);
if (v___x_3567_ == 0)
{
return v___x_3567_;
}
else
{
v_x_3556_ = v_tail_3562_;
v_x_3557_ = v_tail_3564_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0___boxed(lean_object* v_x_3569_, lean_object* v_x_3570_){
_start:
{
uint8_t v_res_3571_; lean_object* v_r_3572_; 
v_res_3571_ = lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0(v_x_3569_, v_x_3570_);
lean_dec(v_x_3570_);
lean_dec(v_x_3569_);
v_r_3572_ = lean_box(v_res_3571_);
return v_r_3572_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_instBEqVerdict_beq(lean_object* v_x_3573_, lean_object* v_x_3574_){
_start:
{
switch(lean_obj_tag(v_x_3573_))
{
case 0:
{
if (lean_obj_tag(v_x_3574_) == 0)
{
uint8_t v___x_3575_; 
v___x_3575_ = 1;
return v___x_3575_;
}
else
{
uint8_t v___x_3576_; 
v___x_3576_ = 0;
return v___x_3576_;
}
}
case 1:
{
if (lean_obj_tag(v_x_3574_) == 1)
{
lean_object* v_a_3577_; lean_object* v_a_3578_; uint8_t v___x_3579_; 
v_a_3577_ = lean_ctor_get(v_x_3573_, 0);
v_a_3578_ = lean_ctor_get(v_x_3574_, 0);
v___x_3579_ = lp_algalVerification_List_beq___at___00Algal_Replay_instBEqVerdict_beq_spec__0(v_a_3577_, v_a_3578_);
return v___x_3579_;
}
else
{
uint8_t v___x_3580_; 
v___x_3580_ = 0;
return v___x_3580_;
}
}
default: 
{
if (lean_obj_tag(v_x_3574_) == 2)
{
uint8_t v_a_3581_; uint8_t v_a_3582_; uint8_t v___x_3583_; 
v_a_3581_ = lean_ctor_get_uint8(v_x_3573_, 0);
v_a_3582_ = lean_ctor_get_uint8(v_x_3574_, 0);
v___x_3583_ = lp_algalVerification_Algal_Replay_instBEqErrorCode_beq(v_a_3581_, v_a_3582_);
return v___x_3583_;
}
else
{
uint8_t v___x_3584_; 
v___x_3584_ = 0;
return v___x_3584_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_instBEqVerdict_beq___boxed(lean_object* v_x_3585_, lean_object* v_x_3586_){
_start:
{
uint8_t v_res_3587_; lean_object* v_r_3588_; 
v_res_3587_ = lp_algalVerification_Algal_Replay_instBEqVerdict_beq(v_x_3585_, v_x_3586_);
lean_dec(v_x_3586_);
lean_dec(v_x_3585_);
v_r_3588_ = lean_box(v_res_3587_);
return v_r_3588_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_verify(lean_object* v_r_3595_, lean_object* v_p_3596_, lean_object* v_store_3597_){
_start:
{
lean_object* v_fields_3598_; lean_object* v_runtime_3599_; lean_object* v_manifest_3600_; lean_object* v_args_3601_; lean_object* v_effects_3602_; lean_object* v_manifest_3603_; uint8_t v___x_3604_; 
v_fields_3598_ = lean_ctor_get(v_r_3595_, 0);
v_runtime_3599_ = lean_ctor_get(v_fields_3598_, 0);
v_manifest_3600_ = lean_ctor_get(v_fields_3598_, 1);
v_args_3601_ = lean_ctor_get(v_fields_3598_, 3);
v_effects_3602_ = lean_ctor_get(v_fields_3598_, 5);
v_manifest_3603_ = lean_ctor_get(v_p_3596_, 0);
v___x_3604_ = lean_string_dec_eq(v_manifest_3600_, v_manifest_3603_);
if (v___x_3604_ == 0)
{
lean_object* v___x_3605_; 
lean_dec(v_store_3597_);
lean_dec_ref(v_p_3596_);
lean_dec_ref(v_r_3595_);
v___x_3605_ = ((lean_object*)(lp_algalVerification_Algal_Replay_verify___closed__0));
return v___x_3605_;
}
else
{
lean_object* v___x_3606_; lean_object* v___x_3607_; lean_object* v___x_3608_; 
lean_inc_ref(v_r_3595_);
v___x_3606_ = lp_algalVerification_Algal_Replay_verifyCfg(v_r_3595_, v_store_3597_);
v___x_3607_ = lean_box(0);
lean_inc(v_effects_3602_);
lean_inc(v_args_3601_);
lean_inc_ref(v_p_3596_);
v___x_3608_ = lp_algalVerification_Algal_Replay_run(v___x_3606_, v_p_3596_, v_args_3601_, v_effects_3602_, v___x_3607_);
if (lean_obj_tag(v___x_3608_) == 0)
{
lean_object* v___x_3609_; 
lean_dec_ref_known(v___x_3608_, 1);
lean_dec_ref(v_p_3596_);
lean_dec_ref(v_r_3595_);
v___x_3609_ = ((lean_object*)(lp_algalVerification_Algal_Replay_verify___closed__1));
return v___x_3609_;
}
else
{
lean_object* v_a_3610_; lean_object* v___x_3612_; uint8_t v_isShared_3613_; uint8_t v_isSharedCheck_3621_; 
v_a_3610_ = lean_ctor_get(v___x_3608_, 0);
v_isSharedCheck_3621_ = !lean_is_exclusive(v___x_3608_);
if (v_isSharedCheck_3621_ == 0)
{
v___x_3612_ = v___x_3608_;
v_isShared_3613_ = v_isSharedCheck_3621_;
goto v_resetjp_3611_;
}
else
{
lean_inc(v_a_3610_);
lean_dec(v___x_3608_);
v___x_3612_ = lean_box(0);
v_isShared_3613_ = v_isSharedCheck_3621_;
goto v_resetjp_3611_;
}
v_resetjp_3611_:
{
lean_object* v_rerun_3614_; lean_object* v_d_3615_; uint8_t v___x_3616_; 
lean_inc_ref(v_runtime_3599_);
lean_inc(v_args_3601_);
v_rerun_3614_ = lp_algalVerification_Algal_Replay_mint(v_p_3596_, v_args_3601_, v_a_3610_, v_runtime_3599_);
v_d_3615_ = lp_algalVerification_Algal_Replay_diffReceipts(v_r_3595_, v_rerun_3614_);
v___x_3616_ = l_List_isEmpty___redArg(v_d_3615_);
if (v___x_3616_ == 0)
{
lean_object* v___x_3618_; 
if (v_isShared_3613_ == 0)
{
lean_ctor_set(v___x_3612_, 0, v_d_3615_);
v___x_3618_ = v___x_3612_;
goto v_reusejp_3617_;
}
else
{
lean_object* v_reuseFailAlloc_3619_; 
v_reuseFailAlloc_3619_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3619_, 0, v_d_3615_);
v___x_3618_ = v_reuseFailAlloc_3619_;
goto v_reusejp_3617_;
}
v_reusejp_3617_:
{
return v___x_3618_;
}
}
else
{
lean_object* v___x_3620_; 
lean_dec(v_d_3615_);
lean_del_object(v___x_3612_);
v___x_3620_ = lean_box(0);
return v___x_3620_;
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Replay_resumeCfg___lam__0(lean_object* v_cells_3622_, lean_object* v___y_3623_){
_start:
{
uint8_t v___x_3624_; 
v___x_3624_ = lp_algalVerification_List_any___at___00Algal_Replay_settledWritesOf_spec__0(v___y_3623_, v_cells_3622_);
return v___x_3624_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resumeCfg___lam__0___boxed(lean_object* v_cells_3625_, lean_object* v___y_3626_){
_start:
{
uint8_t v_res_3627_; lean_object* v_r_3628_; 
v_res_3627_ = lp_algalVerification_Algal_Replay_resumeCfg___lam__0(v_cells_3625_, v___y_3626_);
lean_dec_ref(v___y_3626_);
lean_dec(v_cells_3625_);
v_r_3628_ = lean_box(v_res_3627_);
return v_r_3628_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resumeCfg(lean_object* v_r_3629_, lean_object* v_store_3630_, lean_object* v_live_3631_){
_start:
{
lean_object* v_fields_3632_; lean_object* v_cells_3633_; lean_object* v___f_3634_; lean_object* v___x_3635_; uint8_t v___x_3636_; lean_object* v___x_3637_; 
v_fields_3632_ = lean_ctor_get(v_r_3629_, 0);
lean_inc_ref(v_fields_3632_);
lean_dec_ref(v_r_3629_);
v_cells_3633_ = lean_ctor_get(v_fields_3632_, 4);
lean_inc_n(v_cells_3633_, 2);
lean_dec_ref(v_fields_3632_);
v___f_3634_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_resumeCfg___lam__0___boxed), 2, 1);
lean_closure_set(v___f_3634_, 0, v_cells_3633_);
v___x_3635_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Replay_replaySlotsOf___boxed), 2, 1);
lean_closure_set(v___x_3635_, 0, v_cells_3633_);
v___x_3636_ = 1;
v___x_3637_ = lean_alloc_ctor(0, 4, 2);
lean_ctor_set(v___x_3637_, 0, v_live_3631_);
lean_ctor_set(v___x_3637_, 1, v___x_3635_);
lean_ctor_set(v___x_3637_, 2, v___f_3634_);
lean_ctor_set(v___x_3637_, 3, v_store_3630_);
lean_ctor_set_uint8(v___x_3637_, sizeof(void*)*4, v___x_3636_);
lean_ctor_set_uint8(v___x_3637_, sizeof(void*)*4 + 1, v___x_3636_);
return v___x_3637_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Replay_resume(lean_object* v_r_3647_, lean_object* v_p_3648_, lean_object* v_store_3649_, lean_object* v_live_3650_, lean_object* v_stamp_3651_){
_start:
{
lean_object* v_fields_3652_; lean_object* v_digest_3653_; lean_object* v_manifest_3654_; lean_object* v_args_3655_; lean_object* v_effects_3656_; lean_object* v_manifest_3657_; uint8_t v___x_3658_; 
v_fields_3652_ = lean_ctor_get(v_r_3647_, 0);
v_digest_3653_ = lean_ctor_get(v_r_3647_, 1);
v_manifest_3654_ = lean_ctor_get(v_fields_3652_, 1);
v_args_3655_ = lean_ctor_get(v_fields_3652_, 3);
lean_inc(v_args_3655_);
v_effects_3656_ = lean_ctor_get(v_fields_3652_, 5);
lean_inc(v_effects_3656_);
v_manifest_3657_ = lean_ctor_get(v_p_3648_, 0);
v___x_3658_ = lean_string_dec_eq(v_manifest_3654_, v_manifest_3657_);
if (v___x_3658_ == 0)
{
lean_object* v___x_3659_; 
lean_dec(v_effects_3656_);
lean_dec(v_args_3655_);
lean_dec_ref(v_stamp_3651_);
lean_dec_ref(v_live_3650_);
lean_dec(v_store_3649_);
lean_dec_ref(v_p_3648_);
lean_dec_ref(v_r_3647_);
v___x_3659_ = ((lean_object*)(lp_algalVerification_Algal_Replay_resume___closed__0));
return v___x_3659_;
}
else
{
uint8_t v___x_3660_; 
lean_inc_ref(v_fields_3652_);
lean_inc_ref(v_digest_3653_);
v___x_3660_ = lp_algalVerification_Algal_Replay_instDecidableEqFields_decEq(v_digest_3653_, v_fields_3652_);
if (v___x_3660_ == 0)
{
lean_object* v___x_3661_; 
lean_dec(v_effects_3656_);
lean_dec(v_args_3655_);
lean_dec_ref(v_stamp_3651_);
lean_dec_ref(v_live_3650_);
lean_dec(v_store_3649_);
lean_dec_ref(v_p_3648_);
lean_dec_ref(v_r_3647_);
v___x_3661_ = ((lean_object*)(lp_algalVerification_Algal_Replay_resume___closed__0));
return v___x_3661_;
}
else
{
lean_object* v___x_3662_; 
lean_inc(v_store_3649_);
lean_inc_ref(v_p_3648_);
lean_inc_ref(v_r_3647_);
v___x_3662_ = lp_algalVerification_Algal_Replay_verify(v_r_3647_, v_p_3648_, v_store_3649_);
if (lean_obj_tag(v___x_3662_) == 0)
{
lean_object* v___x_3663_; lean_object* v___x_3664_; lean_object* v___x_3665_; lean_object* v___x_3666_; 
v___x_3663_ = lp_algalVerification_Algal_Replay_resumeCfg(v_r_3647_, v_store_3649_, v_live_3650_);
v___x_3664_ = lp_algalVerification_Algal_Replay_dropSuspended(v_effects_3656_);
v___x_3665_ = lean_box(0);
lean_inc(v_args_3655_);
lean_inc_ref(v_p_3648_);
v___x_3666_ = lp_algalVerification_Algal_Replay_run(v___x_3663_, v_p_3648_, v_args_3655_, v___x_3664_, v___x_3665_);
if (lean_obj_tag(v___x_3666_) == 0)
{
lean_object* v___x_3667_; 
lean_dec_ref_known(v___x_3666_, 1);
lean_dec(v_args_3655_);
lean_dec_ref(v_stamp_3651_);
lean_dec_ref(v_p_3648_);
v___x_3667_ = ((lean_object*)(lp_algalVerification_Algal_Replay_resume___closed__1));
return v___x_3667_;
}
else
{
lean_object* v_a_3668_; lean_object* v___x_3670_; uint8_t v_isShared_3671_; uint8_t v_isSharedCheck_3676_; 
v_a_3668_ = lean_ctor_get(v___x_3666_, 0);
v_isSharedCheck_3676_ = !lean_is_exclusive(v___x_3666_);
if (v_isSharedCheck_3676_ == 0)
{
v___x_3670_ = v___x_3666_;
v_isShared_3671_ = v_isSharedCheck_3676_;
goto v_resetjp_3669_;
}
else
{
lean_inc(v_a_3668_);
lean_dec(v___x_3666_);
v___x_3670_ = lean_box(0);
v_isShared_3671_ = v_isSharedCheck_3676_;
goto v_resetjp_3669_;
}
v_resetjp_3669_:
{
lean_object* v___x_3672_; lean_object* v___x_3674_; 
v___x_3672_ = lp_algalVerification_Algal_Replay_mint(v_p_3648_, v_args_3655_, v_a_3668_, v_stamp_3651_);
if (v_isShared_3671_ == 0)
{
lean_ctor_set(v___x_3670_, 0, v___x_3672_);
v___x_3674_ = v___x_3670_;
goto v_reusejp_3673_;
}
else
{
lean_object* v_reuseFailAlloc_3675_; 
v_reuseFailAlloc_3675_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_3675_, 0, v___x_3672_);
v___x_3674_ = v_reuseFailAlloc_3675_;
goto v_reusejp_3673_;
}
v_reusejp_3673_:
{
return v___x_3674_;
}
}
}
}
else
{
lean_object* v___x_3677_; 
lean_dec(v___x_3662_);
lean_dec(v_effects_3656_);
lean_dec(v_args_3655_);
lean_dec_ref(v_stamp_3651_);
lean_dec_ref(v_live_3650_);
lean_dec(v_store_3649_);
lean_dec_ref(v_p_3648_);
lean_dec_ref(v_r_3647_);
v___x_3677_ = ((lean_object*)(lp_algalVerification_Algal_Replay_resume___closed__2));
return v___x_3677_;
}
}
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Replay_Model(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Json(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_OwnMap(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
