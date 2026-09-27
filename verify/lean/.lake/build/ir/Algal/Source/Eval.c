// Lean compiler output
// Module: Algal.Source.Eval
// Imports: public import Init public meta import Init public import Algal.Source.Model public import Algal.Core.KeyOrder
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
lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(lean_object*, lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* lean_string_append(lean_object*, lean_object*);
lean_object* l_Nat_reprFast(lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
double lean_float_of_bits(uint64_t);
double lean_float_negate(double);
uint64_t lean_float_to_bits(double);
lean_object* lp_algalVerification_Algal_Core_Binary64_admit(uint64_t);
uint8_t lean_float_decLt(double, double);
uint8_t lean_float_decLe(double, double);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
double lean_float_mul(double, double);
double lean_float_sub(double, double);
double lean_float_add(double, double);
double lean_float_div(double, double);
double lean_float_of_nat(lean_object*);
double floor(double);
uint8_t lean_float_beq(double, double);
uint8_t lp_algalVerification_Algal_Source_instDecidableEqBinOp(uint8_t, uint8_t);
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqProd___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Text_keyOrder(lean_object*, lean_object*);
uint8_t l_instDecidableEqOrdering(uint8_t, uint8_t);
lean_object* lean_nat_to_int(lean_object*);
uint8_t lp_algalVerification_Algal_Source_hasEffect(lean_object*);
lean_object* l_List_get_x3fInternal___redArg(lean_object*, lean_object*);
uint8_t l_List_isEmpty___redArg(lean_object*);
lean_object* lean_string_utf8_byte_size(lean_object*);
lean_object* l_Repr_addAppParen(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lean_string_length(lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_Code_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqCode(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqCode___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 31, .m_capacity = 31, .m_length = 30, .m_data = "Algal.Source.Code.typeMismatch"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Source.Code.exprFailed"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 34, .m_capacity = 34, .m_length = 33, .m_data = "Algal.Source.Code.budgetExhausted"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 32, .m_capacity = 32, .m_length = 31, .m_data = "Algal.Source.Code.depthExceeded"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 31, .m_capacity = 31, .m_length = 30, .m_data = "Algal.Source.Code.effectFailed"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 36, .m_capacity = 36, .m_length = 35, .m_data = "Algal.Source.Code.effectUnparseable"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Source.Code.internal"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCode_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode_repr___closed__13_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__14;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___closed__15;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCode_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprCode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprCode_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprCode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprCode = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCode___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqErr_decEq(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqErr_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqErr(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqErr___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "{ "};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "code"};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = " := "};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7;
static const lean_string_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = " }"};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__8_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__11_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__12_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprErr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprErr_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprErr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprErr = (const lean_object*)&lp_algalVerification_Algal_Source_instReprErr___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_err(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_err___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqObs_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqObs_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqObs(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqObs___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ok_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ok_elim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_miss_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_miss_elim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_err_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_err_elim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes_decEq(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instDecidableEqState_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instDecidableEqState_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instDecidableEqState_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "null"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "boolean"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "number"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "string"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "list"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Source_kindOf___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "object"};
static const lean_object* lp_algalVerification_Algal_Source_kindOf___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_kindOf___closed__5_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_kindOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_kindOf___boxed(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_getField_look___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_getField_look___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_getField_look___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField_look(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField_look___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_getField___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_getField___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_getField___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_truthy___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_truthy___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_truthy___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_truthy(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_truthy___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_numOfFloat(double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_numOfFloat___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_itemsOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_fieldsOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_fieldsOf___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Source_evalBin___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Source_evalBin___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBin(uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBin___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_insertEntry(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonSort(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonFields(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonExpr(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonList(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_canonProgram_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonProgram(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_evalArms___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_evalArms___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalArms___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_evalExpr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(1, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_evalExpr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalExpr___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_evalExpr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 14, .m_capacity = 14, .m_length = 13, .m_data = "probabilities"};
static const lean_object* lp_algalVerification_Algal_Source_evalExpr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_evalExpr___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_evalRecordEntries___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_evalRecordEntries___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalRecordEntries___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalRecordEntries(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_evalItems___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_evalItems___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalItems___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalItems(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalExpr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArms(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArms___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalItems___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalRecordEntries___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalExpr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesEntries(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNames(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesItems(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesItems___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesEntries___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNames___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_undelivered(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_undelivered___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_step___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_step___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_step___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_step___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(2, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_step___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_step___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_step(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_step___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_charge(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_charge___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_evalCell___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(2, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_evalCell___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalCell___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCell(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCell___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalOperand(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalOperand___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getOf(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getOf___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_asFloat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_asFloat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0___boxed(lean_object*, lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0;
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "answers"};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "answer"};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "choice"};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 11, .m_capacity = 11, .m_length = 10, .m_data = "confidence"};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "value"};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Source_normalizeDecision___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 1, .m_capacity = 1, .m_length = 0, .m_data = ""};
static const lean_object* lp_algalVerification_Algal_Source_normalizeDecision___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_normalizeDecision___closed__5_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_normalizeDecision(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_normalizeDecision___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_listOf(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_portAccepts(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_portAccepts___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seq___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seq(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seqR___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seqR(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___lam__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___lam__1(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_evalArgs___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(6, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_evalArgs___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalArgs___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_evalArgs___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_evalArgs___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_evalArgs___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_eachItems___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(6, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_eachItems___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_eachItems___redArg___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_eachItems___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "-each/i"};
static const lean_object* lp_algalVerification_Algal_Source_eachItems___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_eachItems___redArg___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__0(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__0___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__1(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__1___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__2(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__2___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__3(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__3___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__4(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__4___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalTail_spec__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__0(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_evalTail___lam__1___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "-decide"};
static const lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalTail___lam__1___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_evalTail___lam__1___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "decide"};
static const lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_evalTail___lam__1___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__4(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__4___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__5(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0___boxed(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_evalTail___lam__6___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "generate"};
static const lean_object* lp_algalVerification_Algal_Source_evalTail___lam__6___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalTail___lam__6___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_evalTail___lam__6___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(5, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_evalTail___lam__6___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_evalTail___lam__6___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__6(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__7(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__7___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__8(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__9(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__9___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_evalTail___lam__2___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 13, .m_capacity = 13, .m_length = 12, .m_data = "-branch-arm-"};
static const lean_object* lp_algalVerification_Algal_Source_evalTail___lam__2___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalTail___lam__2___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__2___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__3(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__3___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__2(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_evalBinds___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "b"};
static const lean_object* lp_algalVerification_Algal_Source_evalBinds___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_evalBinds___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_evalBinds___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "-"};
static const lean_object* lp_algalVerification_Algal_Source_evalBinds___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_evalBinds___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBinds(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_runBody___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "result"};
static const lean_object* lp_algalVerification_Algal_Source_runBody___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_runBody___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runBody(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runBody___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___lam__0(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___lam__0___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_runModule___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = "/"};
static const lean_object* lp_algalVerification_Algal_Source_runModule___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_runModule___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_runModule___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(3, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Source_runModule___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_runModule___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_mkChild___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_mkChild(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Source_runProgram___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*4 + 0, .m_other = 4, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Source_runProgram___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_runProgram___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runProgram(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorIdx(uint8_t v_x_1_){
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
case 5:
{
lean_object* v___x_7_; 
v___x_7_ = lean_unsigned_to_nat(5u);
return v___x_7_;
}
default: 
{
lean_object* v___x_8_; 
v___x_8_ = lean_unsigned_to_nat(6u);
return v___x_8_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorIdx___boxed(lean_object* v_x_9_){
_start:
{
uint8_t v_x_boxed_10_; lean_object* v_res_11_; 
v_x_boxed_10_ = lean_unbox(v_x_9_);
v_res_11_ = lp_algalVerification_Algal_Source_Code_ctorIdx(v_x_boxed_10_);
return v_res_11_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___redArg(lean_object* v_k_12_){
_start:
{
lean_inc(v_k_12_);
return v_k_12_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___redArg___boxed(lean_object* v_k_13_){
_start:
{
lean_object* v_res_14_; 
v_res_14_ = lp_algalVerification_Algal_Source_Code_ctorElim___redArg(v_k_13_);
lean_dec(v_k_13_);
return v_res_14_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim(lean_object* v_motive_15_, lean_object* v_ctorIdx_16_, uint8_t v_t_17_, lean_object* v_h_18_, lean_object* v_k_19_){
_start:
{
lean_inc(v_k_19_);
return v_k_19_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ctorElim___boxed(lean_object* v_motive_20_, lean_object* v_ctorIdx_21_, lean_object* v_t_22_, lean_object* v_h_23_, lean_object* v_k_24_){
_start:
{
uint8_t v_t_boxed_25_; lean_object* v_res_26_; 
v_t_boxed_25_ = lean_unbox(v_t_22_);
v_res_26_ = lp_algalVerification_Algal_Source_Code_ctorElim(v_motive_20_, v_ctorIdx_21_, v_t_boxed_25_, v_h_23_, v_k_24_);
lean_dec(v_k_24_);
lean_dec(v_ctorIdx_21_);
return v_res_26_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___redArg(lean_object* v_typeMismatch_27_){
_start:
{
lean_inc(v_typeMismatch_27_);
return v_typeMismatch_27_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___redArg___boxed(lean_object* v_typeMismatch_28_){
_start:
{
lean_object* v_res_29_; 
v_res_29_ = lp_algalVerification_Algal_Source_Code_typeMismatch_elim___redArg(v_typeMismatch_28_);
lean_dec(v_typeMismatch_28_);
return v_res_29_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim(lean_object* v_motive_30_, uint8_t v_t_31_, lean_object* v_h_32_, lean_object* v_typeMismatch_33_){
_start:
{
lean_inc(v_typeMismatch_33_);
return v_typeMismatch_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_typeMismatch_elim___boxed(lean_object* v_motive_34_, lean_object* v_t_35_, lean_object* v_h_36_, lean_object* v_typeMismatch_37_){
_start:
{
uint8_t v_t_boxed_38_; lean_object* v_res_39_; 
v_t_boxed_38_ = lean_unbox(v_t_35_);
v_res_39_ = lp_algalVerification_Algal_Source_Code_typeMismatch_elim(v_motive_34_, v_t_boxed_38_, v_h_36_, v_typeMismatch_37_);
lean_dec(v_typeMismatch_37_);
return v_res_39_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___redArg(lean_object* v_exprFailed_40_){
_start:
{
lean_inc(v_exprFailed_40_);
return v_exprFailed_40_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___redArg___boxed(lean_object* v_exprFailed_41_){
_start:
{
lean_object* v_res_42_; 
v_res_42_ = lp_algalVerification_Algal_Source_Code_exprFailed_elim___redArg(v_exprFailed_41_);
lean_dec(v_exprFailed_41_);
return v_res_42_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim(lean_object* v_motive_43_, uint8_t v_t_44_, lean_object* v_h_45_, lean_object* v_exprFailed_46_){
_start:
{
lean_inc(v_exprFailed_46_);
return v_exprFailed_46_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_exprFailed_elim___boxed(lean_object* v_motive_47_, lean_object* v_t_48_, lean_object* v_h_49_, lean_object* v_exprFailed_50_){
_start:
{
uint8_t v_t_boxed_51_; lean_object* v_res_52_; 
v_t_boxed_51_ = lean_unbox(v_t_48_);
v_res_52_ = lp_algalVerification_Algal_Source_Code_exprFailed_elim(v_motive_47_, v_t_boxed_51_, v_h_49_, v_exprFailed_50_);
lean_dec(v_exprFailed_50_);
return v_res_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___redArg(lean_object* v_budgetExhausted_53_){
_start:
{
lean_inc(v_budgetExhausted_53_);
return v_budgetExhausted_53_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___redArg___boxed(lean_object* v_budgetExhausted_54_){
_start:
{
lean_object* v_res_55_; 
v_res_55_ = lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___redArg(v_budgetExhausted_54_);
lean_dec(v_budgetExhausted_54_);
return v_res_55_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim(lean_object* v_motive_56_, uint8_t v_t_57_, lean_object* v_h_58_, lean_object* v_budgetExhausted_59_){
_start:
{
lean_inc(v_budgetExhausted_59_);
return v_budgetExhausted_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_budgetExhausted_elim___boxed(lean_object* v_motive_60_, lean_object* v_t_61_, lean_object* v_h_62_, lean_object* v_budgetExhausted_63_){
_start:
{
uint8_t v_t_boxed_64_; lean_object* v_res_65_; 
v_t_boxed_64_ = lean_unbox(v_t_61_);
v_res_65_ = lp_algalVerification_Algal_Source_Code_budgetExhausted_elim(v_motive_60_, v_t_boxed_64_, v_h_62_, v_budgetExhausted_63_);
lean_dec(v_budgetExhausted_63_);
return v_res_65_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___redArg(lean_object* v_depthExceeded_66_){
_start:
{
lean_inc(v_depthExceeded_66_);
return v_depthExceeded_66_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___redArg___boxed(lean_object* v_depthExceeded_67_){
_start:
{
lean_object* v_res_68_; 
v_res_68_ = lp_algalVerification_Algal_Source_Code_depthExceeded_elim___redArg(v_depthExceeded_67_);
lean_dec(v_depthExceeded_67_);
return v_res_68_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim(lean_object* v_motive_69_, uint8_t v_t_70_, lean_object* v_h_71_, lean_object* v_depthExceeded_72_){
_start:
{
lean_inc(v_depthExceeded_72_);
return v_depthExceeded_72_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_depthExceeded_elim___boxed(lean_object* v_motive_73_, lean_object* v_t_74_, lean_object* v_h_75_, lean_object* v_depthExceeded_76_){
_start:
{
uint8_t v_t_boxed_77_; lean_object* v_res_78_; 
v_t_boxed_77_ = lean_unbox(v_t_74_);
v_res_78_ = lp_algalVerification_Algal_Source_Code_depthExceeded_elim(v_motive_73_, v_t_boxed_77_, v_h_75_, v_depthExceeded_76_);
lean_dec(v_depthExceeded_76_);
return v_res_78_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___redArg(lean_object* v_effectFailed_79_){
_start:
{
lean_inc(v_effectFailed_79_);
return v_effectFailed_79_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___redArg___boxed(lean_object* v_effectFailed_80_){
_start:
{
lean_object* v_res_81_; 
v_res_81_ = lp_algalVerification_Algal_Source_Code_effectFailed_elim___redArg(v_effectFailed_80_);
lean_dec(v_effectFailed_80_);
return v_res_81_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim(lean_object* v_motive_82_, uint8_t v_t_83_, lean_object* v_h_84_, lean_object* v_effectFailed_85_){
_start:
{
lean_inc(v_effectFailed_85_);
return v_effectFailed_85_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectFailed_elim___boxed(lean_object* v_motive_86_, lean_object* v_t_87_, lean_object* v_h_88_, lean_object* v_effectFailed_89_){
_start:
{
uint8_t v_t_boxed_90_; lean_object* v_res_91_; 
v_t_boxed_90_ = lean_unbox(v_t_87_);
v_res_91_ = lp_algalVerification_Algal_Source_Code_effectFailed_elim(v_motive_86_, v_t_boxed_90_, v_h_88_, v_effectFailed_89_);
lean_dec(v_effectFailed_89_);
return v_res_91_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___redArg(lean_object* v_effectUnparseable_92_){
_start:
{
lean_inc(v_effectUnparseable_92_);
return v_effectUnparseable_92_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___redArg___boxed(lean_object* v_effectUnparseable_93_){
_start:
{
lean_object* v_res_94_; 
v_res_94_ = lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___redArg(v_effectUnparseable_93_);
lean_dec(v_effectUnparseable_93_);
return v_res_94_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim(lean_object* v_motive_95_, uint8_t v_t_96_, lean_object* v_h_97_, lean_object* v_effectUnparseable_98_){
_start:
{
lean_inc(v_effectUnparseable_98_);
return v_effectUnparseable_98_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_effectUnparseable_elim___boxed(lean_object* v_motive_99_, lean_object* v_t_100_, lean_object* v_h_101_, lean_object* v_effectUnparseable_102_){
_start:
{
uint8_t v_t_boxed_103_; lean_object* v_res_104_; 
v_t_boxed_103_ = lean_unbox(v_t_100_);
v_res_104_ = lp_algalVerification_Algal_Source_Code_effectUnparseable_elim(v_motive_99_, v_t_boxed_103_, v_h_101_, v_effectUnparseable_102_);
lean_dec(v_effectUnparseable_102_);
return v_res_104_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___redArg(lean_object* v_internal_105_){
_start:
{
lean_inc(v_internal_105_);
return v_internal_105_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___redArg___boxed(lean_object* v_internal_106_){
_start:
{
lean_object* v_res_107_; 
v_res_107_ = lp_algalVerification_Algal_Source_Code_internal_elim___redArg(v_internal_106_);
lean_dec(v_internal_106_);
return v_res_107_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim(lean_object* v_motive_108_, uint8_t v_t_109_, lean_object* v_h_110_, lean_object* v_internal_111_){
_start:
{
lean_inc(v_internal_111_);
return v_internal_111_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_internal_elim___boxed(lean_object* v_motive_112_, lean_object* v_t_113_, lean_object* v_h_114_, lean_object* v_internal_115_){
_start:
{
uint8_t v_t_boxed_116_; lean_object* v_res_117_; 
v_t_boxed_116_ = lean_unbox(v_t_113_);
v_res_117_ = lp_algalVerification_Algal_Source_Code_internal_elim(v_motive_112_, v_t_boxed_116_, v_h_114_, v_internal_115_);
lean_dec(v_internal_115_);
return v_res_117_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_Code_ofNat(lean_object* v_n_118_){
_start:
{
lean_object* v___x_119_; uint8_t v___x_120_; 
v___x_119_ = lean_unsigned_to_nat(2u);
v___x_120_ = lean_nat_dec_le(v_n_118_, v___x_119_);
if (v___x_120_ == 0)
{
lean_object* v___x_121_; uint8_t v___x_122_; 
v___x_121_ = lean_unsigned_to_nat(4u);
v___x_122_ = lean_nat_dec_le(v_n_118_, v___x_121_);
if (v___x_122_ == 0)
{
lean_object* v___x_123_; uint8_t v___x_124_; 
v___x_123_ = lean_unsigned_to_nat(5u);
v___x_124_ = lean_nat_dec_le(v_n_118_, v___x_123_);
if (v___x_124_ == 0)
{
uint8_t v___x_125_; 
v___x_125_ = 6;
return v___x_125_;
}
else
{
uint8_t v___x_126_; 
v___x_126_ = 5;
return v___x_126_;
}
}
else
{
lean_object* v___x_127_; uint8_t v___x_128_; 
v___x_127_ = lean_unsigned_to_nat(3u);
v___x_128_ = lean_nat_dec_le(v_n_118_, v___x_127_);
if (v___x_128_ == 0)
{
uint8_t v___x_129_; 
v___x_129_ = 4;
return v___x_129_;
}
else
{
uint8_t v___x_130_; 
v___x_130_ = 3;
return v___x_130_;
}
}
}
else
{
lean_object* v___x_131_; uint8_t v___x_132_; 
v___x_131_ = lean_unsigned_to_nat(0u);
v___x_132_ = lean_nat_dec_le(v_n_118_, v___x_131_);
if (v___x_132_ == 0)
{
lean_object* v___x_133_; uint8_t v___x_134_; 
v___x_133_ = lean_unsigned_to_nat(1u);
v___x_134_ = lean_nat_dec_le(v_n_118_, v___x_133_);
if (v___x_134_ == 0)
{
uint8_t v___x_135_; 
v___x_135_ = 2;
return v___x_135_;
}
else
{
uint8_t v___x_136_; 
v___x_136_ = 1;
return v___x_136_;
}
}
else
{
uint8_t v___x_137_; 
v___x_137_ = 0;
return v___x_137_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Code_ofNat___boxed(lean_object* v_n_138_){
_start:
{
uint8_t v_res_139_; lean_object* v_r_140_; 
v_res_139_ = lp_algalVerification_Algal_Source_Code_ofNat(v_n_138_);
lean_dec(v_n_138_);
v_r_140_ = lean_box(v_res_139_);
return v_r_140_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqCode(uint8_t v_x_141_, uint8_t v_y_142_){
_start:
{
lean_object* v___x_143_; lean_object* v___x_144_; uint8_t v___x_145_; 
v___x_143_ = lp_algalVerification_Algal_Source_Code_ctorIdx(v_x_141_);
v___x_144_ = lp_algalVerification_Algal_Source_Code_ctorIdx(v_y_142_);
v___x_145_ = lean_nat_dec_eq(v___x_143_, v___x_144_);
lean_dec(v___x_144_);
lean_dec(v___x_143_);
return v___x_145_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqCode___boxed(lean_object* v_x_146_, lean_object* v_y_147_){
_start:
{
uint8_t v_x_13__boxed_148_; uint8_t v_y_14__boxed_149_; uint8_t v_res_150_; lean_object* v_r_151_; 
v_x_13__boxed_148_ = lean_unbox(v_x_146_);
v_y_14__boxed_149_ = lean_unbox(v_y_147_);
v_res_150_ = lp_algalVerification_Algal_Source_instDecidableEqCode(v_x_13__boxed_148_, v_y_14__boxed_149_);
v_r_151_ = lean_box(v_res_150_);
return v_r_151_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14(void){
_start:
{
lean_object* v___x_173_; lean_object* v___x_174_; 
v___x_173_ = lean_unsigned_to_nat(2u);
v___x_174_ = lean_nat_to_int(v___x_173_);
return v___x_174_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15(void){
_start:
{
lean_object* v___x_175_; lean_object* v___x_176_; 
v___x_175_ = lean_unsigned_to_nat(1u);
v___x_176_ = lean_nat_to_int(v___x_175_);
return v___x_176_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCode_repr(uint8_t v_x_177_, lean_object* v_prec_178_){
_start:
{
lean_object* v___y_180_; lean_object* v___y_187_; lean_object* v___y_194_; lean_object* v___y_201_; lean_object* v___y_208_; lean_object* v___y_215_; lean_object* v___y_222_; 
switch(v_x_177_)
{
case 0:
{
lean_object* v___x_228_; uint8_t v___x_229_; 
v___x_228_ = lean_unsigned_to_nat(1024u);
v___x_229_ = lean_nat_dec_le(v___x_228_, v_prec_178_);
if (v___x_229_ == 0)
{
lean_object* v___x_230_; 
v___x_230_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_180_ = v___x_230_;
goto v___jp_179_;
}
else
{
lean_object* v___x_231_; 
v___x_231_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_180_ = v___x_231_;
goto v___jp_179_;
}
}
case 1:
{
lean_object* v___x_232_; uint8_t v___x_233_; 
v___x_232_ = lean_unsigned_to_nat(1024u);
v___x_233_ = lean_nat_dec_le(v___x_232_, v_prec_178_);
if (v___x_233_ == 0)
{
lean_object* v___x_234_; 
v___x_234_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_187_ = v___x_234_;
goto v___jp_186_;
}
else
{
lean_object* v___x_235_; 
v___x_235_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_187_ = v___x_235_;
goto v___jp_186_;
}
}
case 2:
{
lean_object* v___x_236_; uint8_t v___x_237_; 
v___x_236_ = lean_unsigned_to_nat(1024u);
v___x_237_ = lean_nat_dec_le(v___x_236_, v_prec_178_);
if (v___x_237_ == 0)
{
lean_object* v___x_238_; 
v___x_238_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_194_ = v___x_238_;
goto v___jp_193_;
}
else
{
lean_object* v___x_239_; 
v___x_239_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_194_ = v___x_239_;
goto v___jp_193_;
}
}
case 3:
{
lean_object* v___x_240_; uint8_t v___x_241_; 
v___x_240_ = lean_unsigned_to_nat(1024u);
v___x_241_ = lean_nat_dec_le(v___x_240_, v_prec_178_);
if (v___x_241_ == 0)
{
lean_object* v___x_242_; 
v___x_242_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_201_ = v___x_242_;
goto v___jp_200_;
}
else
{
lean_object* v___x_243_; 
v___x_243_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_201_ = v___x_243_;
goto v___jp_200_;
}
}
case 4:
{
lean_object* v___x_244_; uint8_t v___x_245_; 
v___x_244_ = lean_unsigned_to_nat(1024u);
v___x_245_ = lean_nat_dec_le(v___x_244_, v_prec_178_);
if (v___x_245_ == 0)
{
lean_object* v___x_246_; 
v___x_246_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_208_ = v___x_246_;
goto v___jp_207_;
}
else
{
lean_object* v___x_247_; 
v___x_247_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_208_ = v___x_247_;
goto v___jp_207_;
}
}
case 5:
{
lean_object* v___x_248_; uint8_t v___x_249_; 
v___x_248_ = lean_unsigned_to_nat(1024u);
v___x_249_ = lean_nat_dec_le(v___x_248_, v_prec_178_);
if (v___x_249_ == 0)
{
lean_object* v___x_250_; 
v___x_250_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_215_ = v___x_250_;
goto v___jp_214_;
}
else
{
lean_object* v___x_251_; 
v___x_251_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_215_ = v___x_251_;
goto v___jp_214_;
}
}
default: 
{
lean_object* v___x_252_; uint8_t v___x_253_; 
v___x_252_ = lean_unsigned_to_nat(1024u);
v___x_253_ = lean_nat_dec_le(v___x_252_, v_prec_178_);
if (v___x_253_ == 0)
{
lean_object* v___x_254_; 
v___x_254_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__14, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__14_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__14);
v___y_222_ = v___x_254_;
goto v___jp_221_;
}
else
{
lean_object* v___x_255_; 
v___x_255_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprCode_repr___closed__15, &lp_algalVerification_Algal_Source_instReprCode_repr___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprCode_repr___closed__15);
v___y_222_ = v___x_255_;
goto v___jp_221_;
}
}
}
v___jp_179_:
{
lean_object* v___x_181_; lean_object* v___x_182_; uint8_t v___x_183_; lean_object* v___x_184_; lean_object* v___x_185_; 
v___x_181_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__1));
lean_inc(v___y_180_);
v___x_182_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_182_, 0, v___y_180_);
lean_ctor_set(v___x_182_, 1, v___x_181_);
v___x_183_ = 0;
v___x_184_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_184_, 0, v___x_182_);
lean_ctor_set_uint8(v___x_184_, sizeof(void*)*1, v___x_183_);
v___x_185_ = l_Repr_addAppParen(v___x_184_, v_prec_178_);
return v___x_185_;
}
v___jp_186_:
{
lean_object* v___x_188_; lean_object* v___x_189_; uint8_t v___x_190_; lean_object* v___x_191_; lean_object* v___x_192_; 
v___x_188_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__3));
lean_inc(v___y_187_);
v___x_189_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_189_, 0, v___y_187_);
lean_ctor_set(v___x_189_, 1, v___x_188_);
v___x_190_ = 0;
v___x_191_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_191_, 0, v___x_189_);
lean_ctor_set_uint8(v___x_191_, sizeof(void*)*1, v___x_190_);
v___x_192_ = l_Repr_addAppParen(v___x_191_, v_prec_178_);
return v___x_192_;
}
v___jp_193_:
{
lean_object* v___x_195_; lean_object* v___x_196_; uint8_t v___x_197_; lean_object* v___x_198_; lean_object* v___x_199_; 
v___x_195_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__5));
lean_inc(v___y_194_);
v___x_196_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_196_, 0, v___y_194_);
lean_ctor_set(v___x_196_, 1, v___x_195_);
v___x_197_ = 0;
v___x_198_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_198_, 0, v___x_196_);
lean_ctor_set_uint8(v___x_198_, sizeof(void*)*1, v___x_197_);
v___x_199_ = l_Repr_addAppParen(v___x_198_, v_prec_178_);
return v___x_199_;
}
v___jp_200_:
{
lean_object* v___x_202_; lean_object* v___x_203_; uint8_t v___x_204_; lean_object* v___x_205_; lean_object* v___x_206_; 
v___x_202_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__7));
lean_inc(v___y_201_);
v___x_203_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_203_, 0, v___y_201_);
lean_ctor_set(v___x_203_, 1, v___x_202_);
v___x_204_ = 0;
v___x_205_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_205_, 0, v___x_203_);
lean_ctor_set_uint8(v___x_205_, sizeof(void*)*1, v___x_204_);
v___x_206_ = l_Repr_addAppParen(v___x_205_, v_prec_178_);
return v___x_206_;
}
v___jp_207_:
{
lean_object* v___x_209_; lean_object* v___x_210_; uint8_t v___x_211_; lean_object* v___x_212_; lean_object* v___x_213_; 
v___x_209_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__9));
lean_inc(v___y_208_);
v___x_210_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_210_, 0, v___y_208_);
lean_ctor_set(v___x_210_, 1, v___x_209_);
v___x_211_ = 0;
v___x_212_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_212_, 0, v___x_210_);
lean_ctor_set_uint8(v___x_212_, sizeof(void*)*1, v___x_211_);
v___x_213_ = l_Repr_addAppParen(v___x_212_, v_prec_178_);
return v___x_213_;
}
v___jp_214_:
{
lean_object* v___x_216_; lean_object* v___x_217_; uint8_t v___x_218_; lean_object* v___x_219_; lean_object* v___x_220_; 
v___x_216_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__11));
lean_inc(v___y_215_);
v___x_217_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_217_, 0, v___y_215_);
lean_ctor_set(v___x_217_, 1, v___x_216_);
v___x_218_ = 0;
v___x_219_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_219_, 0, v___x_217_);
lean_ctor_set_uint8(v___x_219_, sizeof(void*)*1, v___x_218_);
v___x_220_ = l_Repr_addAppParen(v___x_219_, v_prec_178_);
return v___x_220_;
}
v___jp_221_:
{
lean_object* v___x_223_; lean_object* v___x_224_; uint8_t v___x_225_; lean_object* v___x_226_; lean_object* v___x_227_; 
v___x_223_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCode_repr___closed__13));
lean_inc(v___y_222_);
v___x_224_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_224_, 0, v___y_222_);
lean_ctor_set(v___x_224_, 1, v___x_223_);
v___x_225_ = 0;
v___x_226_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_226_, 0, v___x_224_);
lean_ctor_set_uint8(v___x_226_, sizeof(void*)*1, v___x_225_);
v___x_227_ = l_Repr_addAppParen(v___x_226_, v_prec_178_);
return v___x_227_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCode_repr___boxed(lean_object* v_x_256_, lean_object* v_prec_257_){
_start:
{
uint8_t v_x_401__boxed_258_; lean_object* v_res_259_; 
v_x_401__boxed_258_ = lean_unbox(v_x_256_);
v_res_259_ = lp_algalVerification_Algal_Source_instReprCode_repr(v_x_401__boxed_258_, v_prec_257_);
lean_dec(v_prec_257_);
return v_res_259_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqErr_decEq(uint8_t v_x_262_, uint8_t v_x_263_){
_start:
{
uint8_t v___x_264_; 
v___x_264_ = lp_algalVerification_Algal_Source_instDecidableEqCode(v_x_262_, v_x_263_);
return v___x_264_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqErr_decEq___boxed(lean_object* v_x_265_, lean_object* v_x_266_){
_start:
{
uint8_t v_x_24__boxed_267_; uint8_t v_x_25__boxed_268_; uint8_t v_res_269_; lean_object* v_r_270_; 
v_x_24__boxed_267_ = lean_unbox(v_x_265_);
v_x_25__boxed_268_ = lean_unbox(v_x_266_);
v_res_269_ = lp_algalVerification_Algal_Source_instDecidableEqErr_decEq(v_x_24__boxed_267_, v_x_25__boxed_268_);
v_r_270_ = lean_box(v_res_269_);
return v_r_270_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqErr(uint8_t v_x_271_, uint8_t v_x_272_){
_start:
{
uint8_t v___x_273_; 
v___x_273_ = lp_algalVerification_Algal_Source_instDecidableEqCode(v_x_271_, v_x_272_);
return v___x_273_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqErr___boxed(lean_object* v_x_274_, lean_object* v_x_275_){
_start:
{
uint8_t v_x_6__boxed_276_; uint8_t v_x_7__boxed_277_; uint8_t v_res_278_; lean_object* v_r_279_; 
v_x_6__boxed_276_ = lean_unbox(v_x_274_);
v_x_7__boxed_277_ = lean_unbox(v_x_275_);
v_res_278_ = lp_algalVerification_Algal_Source_instDecidableEqErr(v_x_6__boxed_276_, v_x_7__boxed_277_);
v_r_279_ = lean_box(v_res_278_);
return v_r_279_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7(void){
_start:
{
lean_object* v___x_293_; lean_object* v___x_294_; 
v___x_293_ = lean_unsigned_to_nat(8u);
v___x_294_ = lean_nat_to_int(v___x_293_);
return v___x_294_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9(void){
_start:
{
lean_object* v___x_296_; lean_object* v___x_297_; 
v___x_296_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__0));
v___x_297_ = lean_string_length(v___x_296_);
return v___x_297_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10(void){
_start:
{
lean_object* v___x_298_; lean_object* v___x_299_; 
v___x_298_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9, &lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9_once, _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__9);
v___x_299_ = lean_nat_to_int(v___x_298_);
return v___x_299_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg(uint8_t v_x_304_){
_start:
{
lean_object* v___x_305_; lean_object* v___x_306_; lean_object* v___x_307_; lean_object* v___x_308_; lean_object* v___x_309_; uint8_t v___x_310_; lean_object* v___x_311_; lean_object* v___x_312_; lean_object* v___x_313_; lean_object* v___x_314_; lean_object* v___x_315_; lean_object* v___x_316_; lean_object* v___x_317_; lean_object* v___x_318_; lean_object* v___x_319_; 
v___x_305_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__6));
v___x_306_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7, &lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__7);
v___x_307_ = lean_unsigned_to_nat(0u);
v___x_308_ = lp_algalVerification_Algal_Source_instReprCode_repr(v_x_304_, v___x_307_);
v___x_309_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_309_, 0, v___x_306_);
lean_ctor_set(v___x_309_, 1, v___x_308_);
v___x_310_ = 0;
v___x_311_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_311_, 0, v___x_309_);
lean_ctor_set_uint8(v___x_311_, sizeof(void*)*1, v___x_310_);
v___x_312_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_312_, 0, v___x_305_);
lean_ctor_set(v___x_312_, 1, v___x_311_);
v___x_313_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10, &lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10_once, _init_lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__10);
v___x_314_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__11));
v___x_315_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_315_, 0, v___x_314_);
lean_ctor_set(v___x_315_, 1, v___x_312_);
v___x_316_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprErr_repr___redArg___closed__12));
v___x_317_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_317_, 0, v___x_315_);
lean_ctor_set(v___x_317_, 1, v___x_316_);
v___x_318_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_318_, 0, v___x_313_);
lean_ctor_set(v___x_318_, 1, v___x_317_);
v___x_319_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_319_, 0, v___x_318_);
lean_ctor_set_uint8(v___x_319_, sizeof(void*)*1, v___x_310_);
return v___x_319_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___redArg___boxed(lean_object* v_x_320_){
_start:
{
uint8_t v_x_124__boxed_321_; lean_object* v_res_322_; 
v_x_124__boxed_321_ = lean_unbox(v_x_320_);
v_res_322_ = lp_algalVerification_Algal_Source_instReprErr_repr___redArg(v_x_124__boxed_321_);
return v_res_322_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr(uint8_t v_x_323_, lean_object* v_prec_324_){
_start:
{
lean_object* v___x_325_; 
v___x_325_ = lp_algalVerification_Algal_Source_instReprErr_repr___redArg(v_x_323_);
return v___x_325_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprErr_repr___boxed(lean_object* v_x_326_, lean_object* v_prec_327_){
_start:
{
uint8_t v_x_181__boxed_328_; lean_object* v_res_329_; 
v_x_181__boxed_328_ = lean_unbox(v_x_326_);
v_res_329_ = lp_algalVerification_Algal_Source_instReprErr_repr(v_x_181__boxed_328_, v_prec_327_);
lean_dec(v_prec_327_);
return v_res_329_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_err(uint8_t v_code_332_){
_start:
{
return v_code_332_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_err___boxed(lean_object* v_code_333_){
_start:
{
uint8_t v_code_boxed_334_; uint8_t v_res_335_; lean_object* v_r_336_; 
v_code_boxed_334_ = lean_unbox(v_code_333_);
v_res_335_ = lp_algalVerification_Algal_Source_err(v_code_boxed_334_);
v_r_336_ = lean_box(v_res_335_);
return v_r_336_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqObs_decEq(lean_object* v_x_337_, lean_object* v_x_338_){
_start:
{
lean_object* v_site_339_; lean_object* v_kind_340_; lean_object* v_text_341_; lean_object* v_context_342_; lean_object* v_site_343_; lean_object* v_kind_344_; lean_object* v_text_345_; lean_object* v_context_346_; uint8_t v___x_347_; 
v_site_339_ = lean_ctor_get(v_x_337_, 0);
v_kind_340_ = lean_ctor_get(v_x_337_, 1);
v_text_341_ = lean_ctor_get(v_x_337_, 2);
v_context_342_ = lean_ctor_get(v_x_337_, 3);
v_site_343_ = lean_ctor_get(v_x_338_, 0);
v_kind_344_ = lean_ctor_get(v_x_338_, 1);
v_text_345_ = lean_ctor_get(v_x_338_, 2);
v_context_346_ = lean_ctor_get(v_x_338_, 3);
v___x_347_ = lean_string_dec_eq(v_site_339_, v_site_343_);
if (v___x_347_ == 0)
{
return v___x_347_;
}
else
{
uint8_t v___x_348_; 
v___x_348_ = lean_string_dec_eq(v_kind_340_, v_kind_344_);
if (v___x_348_ == 0)
{
return v___x_348_;
}
else
{
uint8_t v___x_349_; 
v___x_349_ = lean_string_dec_eq(v_text_341_, v_text_345_);
if (v___x_349_ == 0)
{
return v___x_349_;
}
else
{
uint8_t v___x_350_; 
v___x_350_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_context_342_, v_context_346_);
return v___x_350_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqObs_decEq___boxed(lean_object* v_x_351_, lean_object* v_x_352_){
_start:
{
uint8_t v_res_353_; lean_object* v_r_354_; 
v_res_353_ = lp_algalVerification_Algal_Source_instDecidableEqObs_decEq(v_x_351_, v_x_352_);
lean_dec_ref(v_x_352_);
lean_dec_ref(v_x_351_);
v_r_354_ = lean_box(v_res_353_);
return v_r_354_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqObs(lean_object* v_x_355_, lean_object* v_x_356_){
_start:
{
uint8_t v___x_357_; 
v___x_357_ = lp_algalVerification_Algal_Source_instDecidableEqObs_decEq(v_x_355_, v_x_356_);
return v___x_357_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqObs___boxed(lean_object* v_x_358_, lean_object* v_x_359_){
_start:
{
uint8_t v_res_360_; lean_object* v_r_361_; 
v_res_360_ = lp_algalVerification_Algal_Source_instDecidableEqObs(v_x_358_, v_x_359_);
lean_dec_ref(v_x_359_);
lean_dec_ref(v_x_358_);
v_r_361_ = lean_box(v_res_360_);
return v_r_361_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___redArg(lean_object* v_x_362_){
_start:
{
switch(lean_obj_tag(v_x_362_))
{
case 0:
{
lean_object* v___x_363_; 
v___x_363_ = lean_unsigned_to_nat(0u);
return v___x_363_;
}
case 1:
{
lean_object* v___x_364_; 
v___x_364_ = lean_unsigned_to_nat(1u);
return v___x_364_;
}
default: 
{
lean_object* v___x_365_; 
v___x_365_ = lean_unsigned_to_nat(2u);
return v___x_365_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___redArg___boxed(lean_object* v_x_366_){
_start:
{
lean_object* v_res_367_; 
v_res_367_ = lp_algalVerification_Algal_Source_Res_ctorIdx___redArg(v_x_366_);
lean_dec(v_x_366_);
return v_res_367_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx(lean_object* v_00_u03b1_368_, lean_object* v_x_369_){
_start:
{
lean_object* v___x_370_; 
v___x_370_ = lp_algalVerification_Algal_Source_Res_ctorIdx___redArg(v_x_369_);
return v___x_370_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorIdx___boxed(lean_object* v_00_u03b1_371_, lean_object* v_x_372_){
_start:
{
lean_object* v_res_373_; 
v_res_373_ = lp_algalVerification_Algal_Source_Res_ctorIdx(v_00_u03b1_371_, v_x_372_);
lean_dec(v_x_372_);
return v_res_373_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim___redArg(lean_object* v_t_374_, lean_object* v_k_375_){
_start:
{
switch(lean_obj_tag(v_t_374_))
{
case 0:
{
lean_object* v_value_376_; lean_object* v___x_377_; 
v_value_376_ = lean_ctor_get(v_t_374_, 0);
lean_inc(v_value_376_);
lean_dec_ref_known(v_t_374_, 1);
v___x_377_ = lean_apply_1(v_k_375_, v_value_376_);
return v___x_377_;
}
case 1:
{
return v_k_375_;
}
default: 
{
uint8_t v_e_378_; lean_object* v___x_379_; lean_object* v___x_380_; 
v_e_378_ = lean_ctor_get_uint8(v_t_374_, 0);
lean_dec_ref_known(v_t_374_, 0);
v___x_379_ = lean_box(v_e_378_);
v___x_380_ = lean_apply_1(v_k_375_, v___x_379_);
return v___x_380_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim(lean_object* v_00_u03b1_381_, lean_object* v_motive_382_, lean_object* v_ctorIdx_383_, lean_object* v_t_384_, lean_object* v_h_385_, lean_object* v_k_386_){
_start:
{
lean_object* v___x_387_; 
v___x_387_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_384_, v_k_386_);
return v___x_387_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ctorElim___boxed(lean_object* v_00_u03b1_388_, lean_object* v_motive_389_, lean_object* v_ctorIdx_390_, lean_object* v_t_391_, lean_object* v_h_392_, lean_object* v_k_393_){
_start:
{
lean_object* v_res_394_; 
v_res_394_ = lp_algalVerification_Algal_Source_Res_ctorElim(v_00_u03b1_388_, v_motive_389_, v_ctorIdx_390_, v_t_391_, v_h_392_, v_k_393_);
lean_dec(v_ctorIdx_390_);
return v_res_394_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ok_elim___redArg(lean_object* v_t_395_, lean_object* v_ok_396_){
_start:
{
lean_object* v___x_397_; 
v___x_397_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_395_, v_ok_396_);
return v___x_397_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_ok_elim(lean_object* v_00_u03b1_398_, lean_object* v_motive_399_, lean_object* v_t_400_, lean_object* v_h_401_, lean_object* v_ok_402_){
_start:
{
lean_object* v___x_403_; 
v___x_403_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_400_, v_ok_402_);
return v___x_403_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_miss_elim___redArg(lean_object* v_t_404_, lean_object* v_miss_405_){
_start:
{
lean_object* v___x_406_; 
v___x_406_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_404_, v_miss_405_);
return v___x_406_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_miss_elim(lean_object* v_00_u03b1_407_, lean_object* v_motive_408_, lean_object* v_t_409_, lean_object* v_h_410_, lean_object* v_miss_411_){
_start:
{
lean_object* v___x_412_; 
v___x_412_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_409_, v_miss_411_);
return v___x_412_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_err_elim___redArg(lean_object* v_t_413_, lean_object* v_err_414_){
_start:
{
lean_object* v___x_415_; 
v___x_415_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_413_, v_err_414_);
return v___x_415_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Res_err_elim(lean_object* v_00_u03b1_416_, lean_object* v_motive_417_, lean_object* v_t_418_, lean_object* v_h_419_, lean_object* v_err_420_){
_start:
{
lean_object* v___x_421_; 
v___x_421_ = lp_algalVerification_Algal_Source_Res_ctorElim___redArg(v_t_418_, v_err_420_);
return v___x_421_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(lean_object* v_inst_422_, lean_object* v_x_423_, lean_object* v_x_424_){
_start:
{
switch(lean_obj_tag(v_x_423_))
{
case 0:
{
lean_object* v_value_425_; uint8_t v___x_426_; 
v_value_425_ = lean_ctor_get(v_x_423_, 0);
lean_inc(v_value_425_);
lean_dec_ref_known(v_x_423_, 1);
v___x_426_ = 0;
if (lean_obj_tag(v_x_424_) == 0)
{
lean_object* v_value_427_; lean_object* v___x_428_; uint8_t v___x_429_; 
v_value_427_ = lean_ctor_get(v_x_424_, 0);
lean_inc(v_value_427_);
lean_dec_ref_known(v_x_424_, 1);
v___x_428_ = lean_apply_2(v_inst_422_, v_value_425_, v_value_427_);
v___x_429_ = lean_unbox(v___x_428_);
if (v___x_429_ == 0)
{
return v___x_426_;
}
else
{
uint8_t v___x_430_; 
v___x_430_ = lean_unbox(v___x_428_);
return v___x_430_;
}
}
else
{
lean_dec(v_value_425_);
lean_dec(v_x_424_);
lean_dec_ref(v_inst_422_);
return v___x_426_;
}
}
case 1:
{
lean_dec_ref(v_inst_422_);
if (lean_obj_tag(v_x_424_) == 1)
{
uint8_t v___x_431_; 
v___x_431_ = 1;
return v___x_431_;
}
else
{
uint8_t v___x_432_; 
lean_dec(v_x_424_);
v___x_432_ = 0;
return v___x_432_;
}
}
default: 
{
uint8_t v_e_433_; uint8_t v___x_434_; 
lean_dec_ref(v_inst_422_);
v_e_433_ = lean_ctor_get_uint8(v_x_423_, 0);
lean_dec_ref_known(v_x_423_, 0);
v___x_434_ = 0;
if (lean_obj_tag(v_x_424_) == 2)
{
uint8_t v_e_435_; uint8_t v___x_436_; 
v_e_435_ = lean_ctor_get_uint8(v_x_424_, 0);
lean_dec_ref_known(v_x_424_, 0);
v___x_436_ = lp_algalVerification_Algal_Source_instDecidableEqCode(v_e_433_, v_e_435_);
if (v___x_436_ == 0)
{
return v___x_434_;
}
else
{
return v___x_436_;
}
}
else
{
lean_dec(v_x_424_);
return v___x_434_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg___boxed(lean_object* v_inst_437_, lean_object* v_x_438_, lean_object* v_x_439_){
_start:
{
uint8_t v_res_440_; lean_object* v_r_441_; 
v_res_440_ = lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(v_inst_437_, v_x_438_, v_x_439_);
v_r_441_ = lean_box(v_res_440_);
return v_r_441_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes_decEq(lean_object* v_00_u03b1_442_, lean_object* v_inst_443_, lean_object* v_x_444_, lean_object* v_x_445_){
_start:
{
uint8_t v___x_446_; 
v___x_446_ = lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(v_inst_443_, v_x_444_, v_x_445_);
return v___x_446_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___boxed(lean_object* v_00_u03b1_447_, lean_object* v_inst_448_, lean_object* v_x_449_, lean_object* v_x_450_){
_start:
{
uint8_t v_res_451_; lean_object* v_r_452_; 
v_res_451_ = lp_algalVerification_Algal_Source_instDecidableEqRes_decEq(v_00_u03b1_447_, v_inst_448_, v_x_449_, v_x_450_);
v_r_452_ = lean_box(v_res_451_);
return v_r_452_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes___redArg(lean_object* v_inst_453_, lean_object* v_x_454_, lean_object* v_x_455_){
_start:
{
uint8_t v___x_456_; 
v___x_456_ = lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(v_inst_453_, v_x_454_, v_x_455_);
return v___x_456_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes___redArg___boxed(lean_object* v_inst_457_, lean_object* v_x_458_, lean_object* v_x_459_){
_start:
{
uint8_t v_res_460_; lean_object* v_r_461_; 
v_res_460_ = lp_algalVerification_Algal_Source_instDecidableEqRes___redArg(v_inst_457_, v_x_458_, v_x_459_);
v_r_461_ = lean_box(v_res_460_);
return v_r_461_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqRes(lean_object* v_00_u03b1_462_, lean_object* v_inst_463_, lean_object* v_x_464_, lean_object* v_x_465_){
_start:
{
uint8_t v___x_466_; 
v___x_466_ = lp_algalVerification_Algal_Source_instDecidableEqRes_decEq___redArg(v_inst_463_, v_x_464_, v_x_465_);
return v___x_466_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqRes___boxed(lean_object* v_00_u03b1_467_, lean_object* v_inst_468_, lean_object* v_x_469_, lean_object* v_x_470_){
_start:
{
uint8_t v_res_471_; lean_object* v_r_472_; 
v_res_471_ = lp_algalVerification_Algal_Source_instDecidableEqRes(v_00_u03b1_467_, v_inst_468_, v_x_469_, v_x_470_);
v_r_472_ = lean_box(v_res_471_);
return v_r_472_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0(lean_object* v_a_473_, lean_object* v_b_474_){
_start:
{
lean_object* v___x_475_; uint8_t v___x_476_; 
v___x_475_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
lean_inc_ref(v___x_475_);
v___x_476_ = l_instDecidableEqProd___redArg(v___x_475_, v___x_475_, v_a_473_, v_b_474_);
return v___x_476_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0___boxed(lean_object* v_a_477_, lean_object* v_b_478_){
_start:
{
uint8_t v_res_479_; lean_object* v_r_480_; 
v_res_479_ = lp_algalVerification_Algal_Source_instDecidableEqState_decEq___lam__0(v_a_477_, v_b_478_);
v_r_480_ = lean_box(v_res_479_);
return v_r_480_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState_decEq(lean_object* v_x_482_, lean_object* v_x_483_){
_start:
{
lean_object* v_steps_484_; lean_object* v_calls_485_; lean_object* v_obs_486_; lean_object* v_invocations_487_; lean_object* v_steps_488_; lean_object* v_calls_489_; lean_object* v_obs_490_; lean_object* v_invocations_491_; uint8_t v___x_492_; 
v_steps_484_ = lean_ctor_get(v_x_482_, 0);
lean_inc(v_steps_484_);
v_calls_485_ = lean_ctor_get(v_x_482_, 1);
lean_inc(v_calls_485_);
v_obs_486_ = lean_ctor_get(v_x_482_, 2);
lean_inc(v_obs_486_);
v_invocations_487_ = lean_ctor_get(v_x_482_, 3);
lean_inc(v_invocations_487_);
lean_dec_ref(v_x_482_);
v_steps_488_ = lean_ctor_get(v_x_483_, 0);
lean_inc(v_steps_488_);
v_calls_489_ = lean_ctor_get(v_x_483_, 1);
lean_inc(v_calls_489_);
v_obs_490_ = lean_ctor_get(v_x_483_, 2);
lean_inc(v_obs_490_);
v_invocations_491_ = lean_ctor_get(v_x_483_, 3);
lean_inc(v_invocations_491_);
lean_dec_ref(v_x_483_);
v___x_492_ = lean_nat_dec_eq(v_steps_484_, v_steps_488_);
lean_dec(v_steps_488_);
lean_dec(v_steps_484_);
if (v___x_492_ == 0)
{
lean_dec(v_invocations_491_);
lean_dec(v_obs_490_);
lean_dec(v_calls_489_);
lean_dec(v_invocations_487_);
lean_dec(v_obs_486_);
lean_dec(v_calls_485_);
return v___x_492_;
}
else
{
uint8_t v___x_493_; 
v___x_493_ = lean_nat_dec_eq(v_calls_485_, v_calls_489_);
lean_dec(v_calls_489_);
lean_dec(v_calls_485_);
if (v___x_493_ == 0)
{
lean_dec(v_invocations_491_);
lean_dec(v_obs_490_);
lean_dec(v_invocations_487_);
lean_dec(v_obs_486_);
return v___x_493_;
}
else
{
lean_object* v___x_494_; uint8_t v___x_495_; 
v___x_494_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_instDecidableEqObs___boxed), 2, 0);
v___x_495_ = l_instDecidableEqList___redArg(v___x_494_, v_obs_486_, v_obs_490_);
if (v___x_495_ == 0)
{
lean_dec(v_invocations_491_);
lean_dec(v_invocations_487_);
return v___x_495_;
}
else
{
lean_object* v___f_496_; uint8_t v___x_497_; 
v___f_496_ = ((lean_object*)(lp_algalVerification_Algal_Source_instDecidableEqState_decEq___closed__0));
v___x_497_ = l_instDecidableEqList___redArg(v___f_496_, v_invocations_487_, v_invocations_491_);
return v___x_497_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState_decEq___boxed(lean_object* v_x_498_, lean_object* v_x_499_){
_start:
{
uint8_t v_res_500_; lean_object* v_r_501_; 
v_res_500_ = lp_algalVerification_Algal_Source_instDecidableEqState_decEq(v_x_498_, v_x_499_);
v_r_501_ = lean_box(v_res_500_);
return v_r_501_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqState(lean_object* v_x_502_, lean_object* v_x_503_){
_start:
{
uint8_t v___x_504_; 
v___x_504_ = lp_algalVerification_Algal_Source_instDecidableEqState_decEq(v_x_502_, v_x_503_);
return v___x_504_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqState___boxed(lean_object* v_x_505_, lean_object* v_x_506_){
_start:
{
uint8_t v_res_507_; lean_object* v_r_508_; 
v_res_507_ = lp_algalVerification_Algal_Source_instDecidableEqState(v_x_505_, v_x_506_);
v_r_508_ = lean_box(v_res_507_);
return v_r_508_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_kindOf(lean_object* v_x_515_){
_start:
{
switch(lean_obj_tag(v_x_515_))
{
case 0:
{
lean_object* v___x_516_; 
v___x_516_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__0));
return v___x_516_;
}
case 1:
{
lean_object* v___x_517_; 
v___x_517_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__1));
return v___x_517_;
}
case 2:
{
lean_object* v___x_518_; 
v___x_518_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__2));
return v___x_518_;
}
case 3:
{
lean_object* v___x_519_; 
v___x_519_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__3));
return v___x_519_;
}
case 4:
{
lean_object* v___x_520_; 
v___x_520_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__4));
return v___x_520_;
}
default: 
{
lean_object* v___x_521_; 
v___x_521_ = ((lean_object*)(lp_algalVerification_Algal_Source_kindOf___closed__5));
return v___x_521_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_kindOf___boxed(lean_object* v_x_522_){
_start:
{
lean_object* v_res_523_; 
v_res_523_ = lp_algalVerification_Algal_Source_kindOf(v_x_522_);
lean_dec(v_x_522_);
return v_res_523_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField_look(lean_object* v_key_526_, lean_object* v_a_527_){
_start:
{
if (lean_obj_tag(v_a_527_) == 0)
{
lean_object* v___x_528_; 
v___x_528_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField_look___closed__0));
return v___x_528_;
}
else
{
lean_object* v_key_529_; lean_object* v_value_530_; lean_object* v_rest_531_; uint8_t v___x_532_; 
v_key_529_ = lean_ctor_get(v_a_527_, 0);
v_value_530_ = lean_ctor_get(v_a_527_, 1);
v_rest_531_ = lean_ctor_get(v_a_527_, 2);
v___x_532_ = lean_string_dec_eq(v_key_529_, v_key_526_);
if (v___x_532_ == 0)
{
v_a_527_ = v_rest_531_;
goto _start;
}
else
{
lean_object* v___x_534_; 
lean_inc(v_value_530_);
v___x_534_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_534_, 0, v_value_530_);
return v___x_534_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField_look___boxed(lean_object* v_key_535_, lean_object* v_a_536_){
_start:
{
lean_object* v_res_537_; 
v_res_537_ = lp_algalVerification_Algal_Source_getField_look(v_key_535_, v_a_536_);
lean_dec(v_a_536_);
lean_dec_ref(v_key_535_);
return v_res_537_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField(lean_object* v_x_541_, lean_object* v_x_542_){
_start:
{
switch(lean_obj_tag(v_x_541_))
{
case 5:
{
lean_object* v_fields_543_; lean_object* v___x_544_; 
v_fields_543_ = lean_ctor_get(v_x_541_, 0);
lean_inc(v_fields_543_);
lean_dec_ref_known(v_x_541_, 1);
v___x_544_ = lp_algalVerification_Algal_Source_getField_look(v_x_542_, v_fields_543_);
lean_dec(v_fields_543_);
return v___x_544_;
}
case 0:
{
lean_object* v___x_545_; 
v___x_545_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_545_, 0, v_x_541_);
return v___x_545_;
}
default: 
{
lean_object* v___x_546_; 
lean_dec(v_x_541_);
v___x_546_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_546_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getField___boxed(lean_object* v_x_547_, lean_object* v_x_548_){
_start:
{
lean_object* v_res_549_; 
v_res_549_ = lp_algalVerification_Algal_Source_getField(v_x_547_, v_x_548_);
lean_dec_ref(v_x_548_);
return v_res_549_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_truthy(lean_object* v_x_553_){
_start:
{
if (lean_obj_tag(v_x_553_) == 1)
{
uint8_t v_value_554_; lean_object* v___x_555_; lean_object* v___x_556_; 
v_value_554_ = lean_ctor_get_uint8(v_x_553_, 0);
v___x_555_ = lean_box(v_value_554_);
v___x_556_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_556_, 0, v___x_555_);
return v___x_556_;
}
else
{
lean_object* v___x_557_; 
v___x_557_ = ((lean_object*)(lp_algalVerification_Algal_Source_truthy___closed__0));
return v___x_557_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_truthy___boxed(lean_object* v_x_558_){
_start:
{
lean_object* v_res_559_; 
v_res_559_ = lp_algalVerification_Algal_Source_truthy(v_x_558_);
lean_dec(v_x_558_);
return v_res_559_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_numOfFloat(double v_f_560_){
_start:
{
uint64_t v___x_561_; lean_object* v___x_562_; 
v___x_561_ = lean_float_to_bits(v_f_560_);
v___x_562_ = lp_algalVerification_Algal_Core_Binary64_admit(v___x_561_);
if (lean_obj_tag(v___x_562_) == 0)
{
lean_object* v___x_563_; 
v___x_563_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_563_;
}
else
{
lean_object* v_val_564_; lean_object* v___x_566_; uint8_t v_isShared_567_; uint8_t v_isSharedCheck_573_; 
v_val_564_ = lean_ctor_get(v___x_562_, 0);
v_isSharedCheck_573_ = !lean_is_exclusive(v___x_562_);
if (v_isSharedCheck_573_ == 0)
{
v___x_566_ = v___x_562_;
v_isShared_567_ = v_isSharedCheck_573_;
goto v_resetjp_565_;
}
else
{
lean_inc(v_val_564_);
lean_dec(v___x_562_);
v___x_566_ = lean_box(0);
v_isShared_567_ = v_isSharedCheck_573_;
goto v_resetjp_565_;
}
v_resetjp_565_:
{
lean_object* v___x_568_; uint64_t v___x_569_; lean_object* v___x_571_; 
v___x_568_ = lean_alloc_ctor(2, 0, 8);
v___x_569_ = lean_unbox_uint64(v_val_564_);
lean_dec(v_val_564_);
lean_ctor_set_uint64(v___x_568_, 0, v___x_569_);
if (v_isShared_567_ == 0)
{
lean_ctor_set(v___x_566_, 0, v___x_568_);
v___x_571_ = v___x_566_;
goto v_reusejp_570_;
}
else
{
lean_object* v_reuseFailAlloc_572_; 
v_reuseFailAlloc_572_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_572_, 0, v___x_568_);
v___x_571_ = v_reuseFailAlloc_572_;
goto v_reusejp_570_;
}
v_reusejp_570_:
{
return v___x_571_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_numOfFloat___boxed(lean_object* v_f_574_){
_start:
{
double v_f_boxed_575_; lean_object* v_res_576_; 
v_f_boxed_575_ = lean_unbox_float(v_f_574_);
lean_dec_ref(v_f_574_);
v_res_576_ = lp_algalVerification_Algal_Source_numOfFloat(v_f_boxed_575_);
return v_res_576_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_itemsOf(lean_object* v_x_577_){
_start:
{
if (lean_obj_tag(v_x_577_) == 0)
{
lean_object* v___x_578_; 
v___x_578_ = lean_box(0);
return v___x_578_;
}
else
{
lean_object* v_head_579_; lean_object* v_tail_580_; lean_object* v___x_582_; uint8_t v_isShared_583_; uint8_t v_isSharedCheck_588_; 
v_head_579_ = lean_ctor_get(v_x_577_, 0);
v_tail_580_ = lean_ctor_get(v_x_577_, 1);
v_isSharedCheck_588_ = !lean_is_exclusive(v_x_577_);
if (v_isSharedCheck_588_ == 0)
{
v___x_582_ = v_x_577_;
v_isShared_583_ = v_isSharedCheck_588_;
goto v_resetjp_581_;
}
else
{
lean_inc(v_tail_580_);
lean_inc(v_head_579_);
lean_dec(v_x_577_);
v___x_582_ = lean_box(0);
v_isShared_583_ = v_isSharedCheck_588_;
goto v_resetjp_581_;
}
v_resetjp_581_:
{
lean_object* v___x_584_; lean_object* v___x_586_; 
v___x_584_ = lp_algalVerification_Algal_Source_itemsOf(v_tail_580_);
if (v_isShared_583_ == 0)
{
lean_ctor_set(v___x_582_, 1, v___x_584_);
v___x_586_ = v___x_582_;
goto v_reusejp_585_;
}
else
{
lean_object* v_reuseFailAlloc_587_; 
v_reuseFailAlloc_587_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_587_, 0, v_head_579_);
lean_ctor_set(v_reuseFailAlloc_587_, 1, v___x_584_);
v___x_586_ = v_reuseFailAlloc_587_;
goto v_reusejp_585_;
}
v_reusejp_585_:
{
return v___x_586_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_fieldsOf(lean_object* v_x_589_){
_start:
{
if (lean_obj_tag(v_x_589_) == 0)
{
lean_object* v___x_590_; 
v___x_590_ = lean_box(0);
return v___x_590_;
}
else
{
lean_object* v_head_591_; lean_object* v_tail_592_; lean_object* v_fst_593_; lean_object* v_snd_594_; lean_object* v___x_595_; lean_object* v___x_596_; 
v_head_591_ = lean_ctor_get(v_x_589_, 0);
v_tail_592_ = lean_ctor_get(v_x_589_, 1);
v_fst_593_ = lean_ctor_get(v_head_591_, 0);
v_snd_594_ = lean_ctor_get(v_head_591_, 1);
v___x_595_ = lp_algalVerification_Algal_Source_fieldsOf(v_tail_592_);
lean_inc(v_snd_594_);
lean_inc(v_fst_593_);
v___x_596_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_596_, 0, v_fst_593_);
lean_ctor_set(v___x_596_, 1, v_snd_594_);
lean_ctor_set(v___x_596_, 2, v___x_595_);
return v___x_596_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_fieldsOf___boxed(lean_object* v_x_597_){
_start:
{
lean_object* v_res_598_; 
v_res_598_ = lp_algalVerification_Algal_Source_fieldsOf(v_x_597_);
lean_dec(v_x_597_);
return v_res_598_;
}
}
static double _init_lp_algalVerification_Algal_Source_evalBin___closed__0(void){
_start:
{
lean_object* v___x_599_; double v___x_600_; 
v___x_599_ = lean_unsigned_to_nat(0u);
v___x_600_ = lean_float_of_nat(v___x_599_);
return v___x_600_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBin(uint8_t v_op_601_, lean_object* v_l_602_, lean_object* v_r_603_){
_start:
{
uint8_t v___y_609_; uint8_t v___y_615_; 
switch(v_op_601_)
{
case 5:
{
uint8_t v___x_629_; lean_object* v___x_630_; lean_object* v___x_631_; 
v___x_629_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_l_602_, v_r_603_);
lean_dec(v_r_603_);
lean_dec(v_l_602_);
v___x_630_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_630_, 0, v___x_629_);
v___x_631_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_631_, 0, v___x_630_);
return v___x_631_;
}
case 6:
{
uint8_t v___x_632_; 
v___x_632_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_l_602_, v_r_603_);
lean_dec(v_r_603_);
lean_dec(v_l_602_);
if (v___x_632_ == 0)
{
uint8_t v___x_633_; 
v___x_633_ = 1;
v___y_609_ = v___x_633_;
goto v___jp_608_;
}
else
{
uint8_t v___x_634_; 
v___x_634_ = 0;
v___y_609_ = v___x_634_;
goto v___jp_608_;
}
}
case 7:
{
goto v___jp_620_;
}
case 8:
{
goto v___jp_620_;
}
case 9:
{
goto v___jp_620_;
}
case 10:
{
goto v___jp_620_;
}
case 11:
{
lean_dec(v_r_603_);
lean_dec(v_l_602_);
goto v___jp_612_;
}
case 12:
{
lean_dec(v_r_603_);
lean_dec(v_l_602_);
goto v___jp_612_;
}
case 13:
{
if (lean_obj_tag(v_l_602_) == 3)
{
if (lean_obj_tag(v_r_603_) == 3)
{
lean_object* v_value_635_; lean_object* v___x_637_; uint8_t v_isShared_638_; uint8_t v_isSharedCheck_651_; 
v_value_635_ = lean_ctor_get(v_l_602_, 0);
v_isSharedCheck_651_ = !lean_is_exclusive(v_l_602_);
if (v_isSharedCheck_651_ == 0)
{
v___x_637_ = v_l_602_;
v_isShared_638_ = v_isSharedCheck_651_;
goto v_resetjp_636_;
}
else
{
lean_inc(v_value_635_);
lean_dec(v_l_602_);
v___x_637_ = lean_box(0);
v_isShared_638_ = v_isSharedCheck_651_;
goto v_resetjp_636_;
}
v_resetjp_636_:
{
lean_object* v_value_639_; lean_object* v___x_641_; uint8_t v_isShared_642_; uint8_t v_isSharedCheck_650_; 
v_value_639_ = lean_ctor_get(v_r_603_, 0);
v_isSharedCheck_650_ = !lean_is_exclusive(v_r_603_);
if (v_isSharedCheck_650_ == 0)
{
v___x_641_ = v_r_603_;
v_isShared_642_ = v_isSharedCheck_650_;
goto v_resetjp_640_;
}
else
{
lean_inc(v_value_639_);
lean_dec(v_r_603_);
v___x_641_ = lean_box(0);
v_isShared_642_ = v_isSharedCheck_650_;
goto v_resetjp_640_;
}
v_resetjp_640_:
{
lean_object* v___x_643_; lean_object* v___x_645_; 
v___x_643_ = lean_string_append(v_value_635_, v_value_639_);
lean_dec_ref(v_value_639_);
if (v_isShared_642_ == 0)
{
lean_ctor_set(v___x_641_, 0, v___x_643_);
v___x_645_ = v___x_641_;
goto v_reusejp_644_;
}
else
{
lean_object* v_reuseFailAlloc_649_; 
v_reuseFailAlloc_649_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_649_, 0, v___x_643_);
v___x_645_ = v_reuseFailAlloc_649_;
goto v_reusejp_644_;
}
v_reusejp_644_:
{
lean_object* v___x_647_; 
if (v_isShared_638_ == 0)
{
lean_ctor_set_tag(v___x_637_, 1);
lean_ctor_set(v___x_637_, 0, v___x_645_);
v___x_647_ = v___x_637_;
goto v_reusejp_646_;
}
else
{
lean_object* v_reuseFailAlloc_648_; 
v_reuseFailAlloc_648_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_648_, 0, v___x_645_);
v___x_647_ = v_reuseFailAlloc_648_;
goto v_reusejp_646_;
}
v_reusejp_646_:
{
return v___x_647_;
}
}
}
}
}
else
{
lean_dec_ref_known(v_l_602_, 1);
lean_dec(v_r_603_);
goto v___jp_606_;
}
}
else
{
lean_dec(v_r_603_);
lean_dec(v_l_602_);
goto v___jp_606_;
}
}
default: 
{
if (lean_obj_tag(v_l_602_) == 2)
{
if (lean_obj_tag(v_r_603_) == 2)
{
uint64_t v_value_652_; uint64_t v_value_653_; double v_af_654_; double v_bf_655_; double v___y_657_; uint8_t v___y_677_; uint8_t v___x_681_; uint8_t v___x_682_; 
v_value_652_ = lean_ctor_get_uint64(v_l_602_, 0);
lean_dec_ref_known(v_l_602_, 0);
v_value_653_ = lean_ctor_get_uint64(v_r_603_, 0);
lean_dec_ref_known(v_r_603_, 0);
v_af_654_ = lean_float_of_bits(v_value_652_);
v_bf_655_ = lean_float_of_bits(v_value_653_);
v___x_681_ = 3;
v___x_682_ = lp_algalVerification_Algal_Source_instDecidableEqBinOp(v_op_601_, v___x_681_);
if (v___x_682_ == 0)
{
uint8_t v___x_683_; uint8_t v___x_684_; 
v___x_683_ = 4;
v___x_684_ = lp_algalVerification_Algal_Source_instDecidableEqBinOp(v_op_601_, v___x_683_);
v___y_677_ = v___x_684_;
goto v___jp_676_;
}
else
{
v___y_677_ = v___x_682_;
goto v___jp_676_;
}
v___jp_656_:
{
double v___x_658_; double v___x_659_; lean_object* v___x_660_; 
v___x_658_ = lean_float_mul(v_bf_655_, v___y_657_);
v___x_659_ = lean_float_sub(v_af_654_, v___x_658_);
v___x_660_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_659_);
return v___x_660_;
}
v___jp_661_:
{
switch(v_op_601_)
{
case 0:
{
double v___x_662_; lean_object* v___x_663_; 
v___x_662_ = lean_float_add(v_af_654_, v_bf_655_);
v___x_663_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_662_);
return v___x_663_;
}
case 1:
{
double v___x_664_; lean_object* v___x_665_; 
v___x_664_ = lean_float_sub(v_af_654_, v_bf_655_);
v___x_665_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_664_);
return v___x_665_;
}
case 2:
{
double v___x_666_; lean_object* v___x_667_; 
v___x_666_ = lean_float_mul(v_af_654_, v_bf_655_);
v___x_667_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_666_);
return v___x_667_;
}
case 3:
{
double v___x_668_; lean_object* v___x_669_; 
v___x_668_ = lean_float_div(v_af_654_, v_bf_655_);
v___x_669_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_668_);
return v___x_669_;
}
default: 
{
double v_q_670_; double v___x_671_; uint8_t v___x_672_; 
v_q_670_ = lean_float_div(v_af_654_, v_bf_655_);
v___x_671_ = lean_float_once(&lp_algalVerification_Algal_Source_evalBin___closed__0, &lp_algalVerification_Algal_Source_evalBin___closed__0_once, _init_lp_algalVerification_Algal_Source_evalBin___closed__0);
v___x_672_ = lean_float_decLe(v___x_671_, v_q_670_);
if (v___x_672_ == 0)
{
double v___x_673_; double v___x_674_; 
v___x_673_ = floor(v_q_670_);
v___x_674_ = lean_float_negate(v___x_673_);
v___y_657_ = v___x_674_;
goto v___jp_656_;
}
else
{
double v___x_675_; 
v___x_675_ = floor(v_q_670_);
v___y_657_ = v___x_675_;
goto v___jp_656_;
}
}
}
}
v___jp_676_:
{
if (v___y_677_ == 0)
{
goto v___jp_661_;
}
else
{
double v___x_678_; uint8_t v___x_679_; 
v___x_678_ = lean_float_once(&lp_algalVerification_Algal_Source_evalBin___closed__0, &lp_algalVerification_Algal_Source_evalBin___closed__0_once, _init_lp_algalVerification_Algal_Source_evalBin___closed__0);
v___x_679_ = lean_float_beq(v_bf_655_, v___x_678_);
if (v___x_679_ == 0)
{
goto v___jp_661_;
}
else
{
lean_object* v___x_680_; 
v___x_680_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_680_;
}
}
}
}
else
{
lean_dec_ref_known(v_l_602_, 0);
lean_dec(v_r_603_);
goto v___jp_604_;
}
}
else
{
lean_dec(v_r_603_);
lean_dec(v_l_602_);
goto v___jp_604_;
}
}
}
v___jp_604_:
{
lean_object* v___x_605_; 
v___x_605_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_605_;
}
v___jp_606_:
{
lean_object* v___x_607_; 
v___x_607_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_607_;
}
v___jp_608_:
{
lean_object* v___x_610_; lean_object* v___x_611_; 
v___x_610_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_610_, 0, v___y_609_);
v___x_611_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_611_, 0, v___x_610_);
return v___x_611_;
}
v___jp_612_:
{
lean_object* v___x_613_; 
v___x_613_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_613_;
}
v___jp_614_:
{
lean_object* v___x_616_; lean_object* v___x_617_; 
v___x_616_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_616_, 0, v___y_615_);
v___x_617_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_617_, 0, v___x_616_);
return v___x_617_;
}
v___jp_618_:
{
lean_object* v___x_619_; 
v___x_619_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_619_;
}
v___jp_620_:
{
if (lean_obj_tag(v_l_602_) == 2)
{
if (lean_obj_tag(v_r_603_) == 2)
{
uint64_t v_value_621_; uint64_t v_value_622_; double v_af_623_; double v_bf_624_; uint8_t v___x_625_; uint8_t v___x_626_; 
v_value_621_ = lean_ctor_get_uint64(v_l_602_, 0);
lean_dec_ref_known(v_l_602_, 0);
v_value_622_ = lean_ctor_get_uint64(v_r_603_, 0);
lean_dec_ref_known(v_r_603_, 0);
v_af_623_ = lean_float_of_bits(v_value_621_);
v_bf_624_ = lean_float_of_bits(v_value_622_);
v___x_625_ = lean_float_decLt(v_af_623_, v_bf_624_);
v___x_626_ = lean_float_decLe(v_af_623_, v_bf_624_);
switch(v_op_601_)
{
case 7:
{
v___y_615_ = v___x_625_;
goto v___jp_614_;
}
case 8:
{
v___y_615_ = v___x_626_;
goto v___jp_614_;
}
case 9:
{
uint8_t v___x_627_; 
v___x_627_ = lean_float_decLt(v_bf_624_, v_af_623_);
v___y_615_ = v___x_627_;
goto v___jp_614_;
}
default: 
{
uint8_t v___x_628_; 
v___x_628_ = lean_float_decLe(v_bf_624_, v_af_623_);
v___y_615_ = v___x_628_;
goto v___jp_614_;
}
}
}
else
{
lean_dec_ref_known(v_l_602_, 0);
lean_dec(v_r_603_);
goto v___jp_618_;
}
}
else
{
lean_dec(v_r_603_);
lean_dec(v_l_602_);
goto v___jp_618_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBin___boxed(lean_object* v_op_685_, lean_object* v_l_686_, lean_object* v_r_687_){
_start:
{
uint8_t v_op_boxed_688_; lean_object* v_res_689_; 
v_op_boxed_688_ = lean_unbox(v_op_685_);
v_res_689_ = lp_algalVerification_Algal_Source_evalBin(v_op_boxed_688_, v_l_686_, v_r_687_);
return v_res_689_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_insertEntry(lean_object* v_e_690_, lean_object* v_x_691_){
_start:
{
if (lean_obj_tag(v_x_691_) == 0)
{
lean_object* v___x_692_; 
v___x_692_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_692_, 0, v_e_690_);
lean_ctor_set(v___x_692_, 1, v_x_691_);
return v___x_692_;
}
else
{
lean_object* v_head_693_; lean_object* v_tail_694_; lean_object* v_fst_695_; lean_object* v_fst_696_; uint8_t v___x_697_; uint8_t v___x_698_; uint8_t v___x_699_; 
v_head_693_ = lean_ctor_get(v_x_691_, 0);
lean_inc(v_head_693_);
v_tail_694_ = lean_ctor_get(v_x_691_, 1);
v_fst_695_ = lean_ctor_get(v_e_690_, 0);
v_fst_696_ = lean_ctor_get(v_head_693_, 0);
lean_inc(v_fst_696_);
lean_inc(v_fst_695_);
v___x_697_ = lp_algalVerification_Algal_Core_Text_keyOrder(v_fst_695_, v_fst_696_);
v___x_698_ = 2;
v___x_699_ = l_instDecidableEqOrdering(v___x_697_, v___x_698_);
if (v___x_699_ == 0)
{
lean_object* v___x_701_; uint8_t v_isShared_702_; uint8_t v_isSharedCheck_706_; 
v_isSharedCheck_706_ = !lean_is_exclusive(v_head_693_);
if (v_isSharedCheck_706_ == 0)
{
lean_object* v_unused_707_; lean_object* v_unused_708_; 
v_unused_707_ = lean_ctor_get(v_head_693_, 1);
lean_dec(v_unused_707_);
v_unused_708_ = lean_ctor_get(v_head_693_, 0);
lean_dec(v_unused_708_);
v___x_701_ = v_head_693_;
v_isShared_702_ = v_isSharedCheck_706_;
goto v_resetjp_700_;
}
else
{
lean_dec(v_head_693_);
v___x_701_ = lean_box(0);
v_isShared_702_ = v_isSharedCheck_706_;
goto v_resetjp_700_;
}
v_resetjp_700_:
{
lean_object* v___x_704_; 
if (v_isShared_702_ == 0)
{
lean_ctor_set_tag(v___x_701_, 1);
lean_ctor_set(v___x_701_, 1, v_x_691_);
lean_ctor_set(v___x_701_, 0, v_e_690_);
v___x_704_ = v___x_701_;
goto v_reusejp_703_;
}
else
{
lean_object* v_reuseFailAlloc_705_; 
v_reuseFailAlloc_705_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_705_, 0, v_e_690_);
lean_ctor_set(v_reuseFailAlloc_705_, 1, v_x_691_);
v___x_704_ = v_reuseFailAlloc_705_;
goto v_reusejp_703_;
}
v_reusejp_703_:
{
return v___x_704_;
}
}
}
else
{
lean_object* v___x_710_; uint8_t v_isShared_711_; uint8_t v_isSharedCheck_716_; 
lean_inc(v_tail_694_);
v_isSharedCheck_716_ = !lean_is_exclusive(v_x_691_);
if (v_isSharedCheck_716_ == 0)
{
lean_object* v_unused_717_; lean_object* v_unused_718_; 
v_unused_717_ = lean_ctor_get(v_x_691_, 1);
lean_dec(v_unused_717_);
v_unused_718_ = lean_ctor_get(v_x_691_, 0);
lean_dec(v_unused_718_);
v___x_710_ = v_x_691_;
v_isShared_711_ = v_isSharedCheck_716_;
goto v_resetjp_709_;
}
else
{
lean_dec(v_x_691_);
v___x_710_ = lean_box(0);
v_isShared_711_ = v_isSharedCheck_716_;
goto v_resetjp_709_;
}
v_resetjp_709_:
{
lean_object* v___x_712_; lean_object* v___x_714_; 
v___x_712_ = lp_algalVerification_Algal_Source_insertEntry(v_e_690_, v_tail_694_);
if (v_isShared_711_ == 0)
{
lean_ctor_set(v___x_710_, 1, v___x_712_);
v___x_714_ = v___x_710_;
goto v_reusejp_713_;
}
else
{
lean_object* v_reuseFailAlloc_715_; 
v_reuseFailAlloc_715_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_715_, 0, v_head_693_);
lean_ctor_set(v_reuseFailAlloc_715_, 1, v___x_712_);
v___x_714_ = v_reuseFailAlloc_715_;
goto v_reusejp_713_;
}
v_reusejp_713_:
{
return v___x_714_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonSort(lean_object* v_x_719_){
_start:
{
if (lean_obj_tag(v_x_719_) == 0)
{
return v_x_719_;
}
else
{
lean_object* v_head_720_; lean_object* v_tail_721_; lean_object* v___x_722_; lean_object* v___x_723_; 
v_head_720_ = lean_ctor_get(v_x_719_, 0);
lean_inc(v_head_720_);
v_tail_721_ = lean_ctor_get(v_x_719_, 1);
lean_inc(v_tail_721_);
lean_dec_ref_known(v_x_719_, 2);
v___x_722_ = lp_algalVerification_Algal_Source_canonSort(v_tail_721_);
v___x_723_ = lp_algalVerification_Algal_Source_insertEntry(v_head_720_, v___x_722_);
return v___x_723_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonFields(lean_object* v_x_724_){
_start:
{
if (lean_obj_tag(v_x_724_) == 0)
{
return v_x_724_;
}
else
{
lean_object* v_head_725_; lean_object* v_tail_726_; lean_object* v___x_728_; uint8_t v_isShared_729_; uint8_t v_isSharedCheck_744_; 
v_head_725_ = lean_ctor_get(v_x_724_, 0);
v_tail_726_ = lean_ctor_get(v_x_724_, 1);
v_isSharedCheck_744_ = !lean_is_exclusive(v_x_724_);
if (v_isSharedCheck_744_ == 0)
{
v___x_728_ = v_x_724_;
v_isShared_729_ = v_isSharedCheck_744_;
goto v_resetjp_727_;
}
else
{
lean_inc(v_tail_726_);
lean_inc(v_head_725_);
lean_dec(v_x_724_);
v___x_728_ = lean_box(0);
v_isShared_729_ = v_isSharedCheck_744_;
goto v_resetjp_727_;
}
v_resetjp_727_:
{
lean_object* v_fst_730_; lean_object* v_snd_731_; lean_object* v___x_733_; uint8_t v_isShared_734_; uint8_t v_isSharedCheck_743_; 
v_fst_730_ = lean_ctor_get(v_head_725_, 0);
v_snd_731_ = lean_ctor_get(v_head_725_, 1);
v_isSharedCheck_743_ = !lean_is_exclusive(v_head_725_);
if (v_isSharedCheck_743_ == 0)
{
v___x_733_ = v_head_725_;
v_isShared_734_ = v_isSharedCheck_743_;
goto v_resetjp_732_;
}
else
{
lean_inc(v_snd_731_);
lean_inc(v_fst_730_);
lean_dec(v_head_725_);
v___x_733_ = lean_box(0);
v_isShared_734_ = v_isSharedCheck_743_;
goto v_resetjp_732_;
}
v_resetjp_732_:
{
lean_object* v___x_735_; lean_object* v___x_737_; 
v___x_735_ = lp_algalVerification_Algal_Source_canonExpr(v_snd_731_);
if (v_isShared_734_ == 0)
{
lean_ctor_set(v___x_733_, 1, v___x_735_);
v___x_737_ = v___x_733_;
goto v_reusejp_736_;
}
else
{
lean_object* v_reuseFailAlloc_742_; 
v_reuseFailAlloc_742_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_742_, 0, v_fst_730_);
lean_ctor_set(v_reuseFailAlloc_742_, 1, v___x_735_);
v___x_737_ = v_reuseFailAlloc_742_;
goto v_reusejp_736_;
}
v_reusejp_736_:
{
lean_object* v___x_738_; lean_object* v___x_740_; 
v___x_738_ = lp_algalVerification_Algal_Source_canonFields(v_tail_726_);
if (v_isShared_729_ == 0)
{
lean_ctor_set(v___x_728_, 1, v___x_738_);
lean_ctor_set(v___x_728_, 0, v___x_737_);
v___x_740_ = v___x_728_;
goto v_reusejp_739_;
}
else
{
lean_object* v_reuseFailAlloc_741_; 
v_reuseFailAlloc_741_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_741_, 0, v___x_737_);
lean_ctor_set(v_reuseFailAlloc_741_, 1, v___x_738_);
v___x_740_ = v_reuseFailAlloc_741_;
goto v_reusejp_739_;
}
v_reusejp_739_:
{
return v___x_740_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonExpr(lean_object* v_x_745_){
_start:
{
switch(lean_obj_tag(v_x_745_))
{
case 2:
{
lean_object* v_value_746_; lean_object* v_name_747_; lean_object* v___x_749_; uint8_t v_isShared_750_; uint8_t v_isSharedCheck_755_; 
v_value_746_ = lean_ctor_get(v_x_745_, 0);
v_name_747_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_755_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_755_ == 0)
{
v___x_749_ = v_x_745_;
v_isShared_750_ = v_isSharedCheck_755_;
goto v_resetjp_748_;
}
else
{
lean_inc(v_name_747_);
lean_inc(v_value_746_);
lean_dec(v_x_745_);
v___x_749_ = lean_box(0);
v_isShared_750_ = v_isSharedCheck_755_;
goto v_resetjp_748_;
}
v_resetjp_748_:
{
lean_object* v___x_751_; lean_object* v___x_753_; 
v___x_751_ = lp_algalVerification_Algal_Source_canonExpr(v_value_746_);
if (v_isShared_750_ == 0)
{
lean_ctor_set(v___x_749_, 0, v___x_751_);
v___x_753_ = v___x_749_;
goto v_reusejp_752_;
}
else
{
lean_object* v_reuseFailAlloc_754_; 
v_reuseFailAlloc_754_ = lean_alloc_ctor(2, 2, 0);
lean_ctor_set(v_reuseFailAlloc_754_, 0, v___x_751_);
lean_ctor_set(v_reuseFailAlloc_754_, 1, v_name_747_);
v___x_753_ = v_reuseFailAlloc_754_;
goto v_reusejp_752_;
}
v_reusejp_752_:
{
return v___x_753_;
}
}
}
case 3:
{
lean_object* v_value_756_; lean_object* v_label_757_; lean_object* v___x_759_; uint8_t v_isShared_760_; uint8_t v_isSharedCheck_766_; 
v_value_756_ = lean_ctor_get(v_x_745_, 0);
v_label_757_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_766_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_766_ == 0)
{
v___x_759_ = v_x_745_;
v_isShared_760_ = v_isSharedCheck_766_;
goto v_resetjp_758_;
}
else
{
lean_inc(v_label_757_);
lean_inc(v_value_756_);
lean_dec(v_x_745_);
v___x_759_ = lean_box(0);
v_isShared_760_ = v_isSharedCheck_766_;
goto v_resetjp_758_;
}
v_resetjp_758_:
{
lean_object* v___x_761_; lean_object* v___x_762_; lean_object* v___x_764_; 
v___x_761_ = lp_algalVerification_Algal_Source_canonExpr(v_value_756_);
v___x_762_ = lp_algalVerification_Algal_Source_canonExpr(v_label_757_);
if (v_isShared_760_ == 0)
{
lean_ctor_set(v___x_759_, 1, v___x_762_);
lean_ctor_set(v___x_759_, 0, v___x_761_);
v___x_764_ = v___x_759_;
goto v_reusejp_763_;
}
else
{
lean_object* v_reuseFailAlloc_765_; 
v_reuseFailAlloc_765_ = lean_alloc_ctor(3, 2, 0);
lean_ctor_set(v_reuseFailAlloc_765_, 0, v___x_761_);
lean_ctor_set(v_reuseFailAlloc_765_, 1, v___x_762_);
v___x_764_ = v_reuseFailAlloc_765_;
goto v_reusejp_763_;
}
v_reusejp_763_:
{
return v___x_764_;
}
}
}
case 4:
{
uint8_t v_op_767_; lean_object* v_value_768_; lean_object* v___x_770_; uint8_t v_isShared_771_; uint8_t v_isSharedCheck_776_; 
v_op_767_ = lean_ctor_get_uint8(v_x_745_, sizeof(void*)*1);
v_value_768_ = lean_ctor_get(v_x_745_, 0);
v_isSharedCheck_776_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_776_ == 0)
{
v___x_770_ = v_x_745_;
v_isShared_771_ = v_isSharedCheck_776_;
goto v_resetjp_769_;
}
else
{
lean_inc(v_value_768_);
lean_dec(v_x_745_);
v___x_770_ = lean_box(0);
v_isShared_771_ = v_isSharedCheck_776_;
goto v_resetjp_769_;
}
v_resetjp_769_:
{
lean_object* v___x_772_; lean_object* v___x_774_; 
v___x_772_ = lp_algalVerification_Algal_Source_canonExpr(v_value_768_);
if (v_isShared_771_ == 0)
{
lean_ctor_set(v___x_770_, 0, v___x_772_);
v___x_774_ = v___x_770_;
goto v_reusejp_773_;
}
else
{
lean_object* v_reuseFailAlloc_775_; 
v_reuseFailAlloc_775_ = lean_alloc_ctor(4, 1, 1);
lean_ctor_set(v_reuseFailAlloc_775_, 0, v___x_772_);
lean_ctor_set_uint8(v_reuseFailAlloc_775_, sizeof(void*)*1, v_op_767_);
v___x_774_ = v_reuseFailAlloc_775_;
goto v_reusejp_773_;
}
v_reusejp_773_:
{
return v___x_774_;
}
}
}
case 5:
{
uint8_t v_op_777_; lean_object* v_left_778_; lean_object* v_right_779_; lean_object* v___x_781_; uint8_t v_isShared_782_; uint8_t v_isSharedCheck_788_; 
v_op_777_ = lean_ctor_get_uint8(v_x_745_, sizeof(void*)*2);
v_left_778_ = lean_ctor_get(v_x_745_, 0);
v_right_779_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_788_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_788_ == 0)
{
v___x_781_ = v_x_745_;
v_isShared_782_ = v_isSharedCheck_788_;
goto v_resetjp_780_;
}
else
{
lean_inc(v_right_779_);
lean_inc(v_left_778_);
lean_dec(v_x_745_);
v___x_781_ = lean_box(0);
v_isShared_782_ = v_isSharedCheck_788_;
goto v_resetjp_780_;
}
v_resetjp_780_:
{
lean_object* v___x_783_; lean_object* v___x_784_; lean_object* v___x_786_; 
v___x_783_ = lp_algalVerification_Algal_Source_canonExpr(v_left_778_);
v___x_784_ = lp_algalVerification_Algal_Source_canonExpr(v_right_779_);
if (v_isShared_782_ == 0)
{
lean_ctor_set(v___x_781_, 1, v___x_784_);
lean_ctor_set(v___x_781_, 0, v___x_783_);
v___x_786_ = v___x_781_;
goto v_reusejp_785_;
}
else
{
lean_object* v_reuseFailAlloc_787_; 
v_reuseFailAlloc_787_ = lean_alloc_ctor(5, 2, 1);
lean_ctor_set(v_reuseFailAlloc_787_, 0, v___x_783_);
lean_ctor_set(v_reuseFailAlloc_787_, 1, v___x_784_);
lean_ctor_set_uint8(v_reuseFailAlloc_787_, sizeof(void*)*2, v_op_777_);
v___x_786_ = v_reuseFailAlloc_787_;
goto v_reusejp_785_;
}
v_reusejp_785_:
{
return v___x_786_;
}
}
}
case 6:
{
lean_object* v_entries_789_; lean_object* v___x_791_; uint8_t v_isShared_792_; uint8_t v_isSharedCheck_798_; 
v_entries_789_ = lean_ctor_get(v_x_745_, 0);
v_isSharedCheck_798_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_798_ == 0)
{
v___x_791_ = v_x_745_;
v_isShared_792_ = v_isSharedCheck_798_;
goto v_resetjp_790_;
}
else
{
lean_inc(v_entries_789_);
lean_dec(v_x_745_);
v___x_791_ = lean_box(0);
v_isShared_792_ = v_isSharedCheck_798_;
goto v_resetjp_790_;
}
v_resetjp_790_:
{
lean_object* v___x_793_; lean_object* v___x_794_; lean_object* v___x_796_; 
v___x_793_ = lp_algalVerification_Algal_Source_canonFields(v_entries_789_);
v___x_794_ = lp_algalVerification_Algal_Source_canonSort(v___x_793_);
if (v_isShared_792_ == 0)
{
lean_ctor_set(v___x_791_, 0, v___x_794_);
v___x_796_ = v___x_791_;
goto v_reusejp_795_;
}
else
{
lean_object* v_reuseFailAlloc_797_; 
v_reuseFailAlloc_797_ = lean_alloc_ctor(6, 1, 0);
lean_ctor_set(v_reuseFailAlloc_797_, 0, v___x_794_);
v___x_796_ = v_reuseFailAlloc_797_;
goto v_reusejp_795_;
}
v_reusejp_795_:
{
return v___x_796_;
}
}
}
case 7:
{
lean_object* v_items_799_; lean_object* v___x_801_; uint8_t v_isShared_802_; uint8_t v_isSharedCheck_807_; 
v_items_799_ = lean_ctor_get(v_x_745_, 0);
v_isSharedCheck_807_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_807_ == 0)
{
v___x_801_ = v_x_745_;
v_isShared_802_ = v_isSharedCheck_807_;
goto v_resetjp_800_;
}
else
{
lean_inc(v_items_799_);
lean_dec(v_x_745_);
v___x_801_ = lean_box(0);
v_isShared_802_ = v_isSharedCheck_807_;
goto v_resetjp_800_;
}
v_resetjp_800_:
{
lean_object* v___x_803_; lean_object* v___x_805_; 
v___x_803_ = lp_algalVerification_Algal_Source_canonList(v_items_799_);
if (v_isShared_802_ == 0)
{
lean_ctor_set(v___x_801_, 0, v___x_803_);
v___x_805_ = v___x_801_;
goto v_reusejp_804_;
}
else
{
lean_object* v_reuseFailAlloc_806_; 
v_reuseFailAlloc_806_ = lean_alloc_ctor(7, 1, 0);
lean_ctor_set(v_reuseFailAlloc_806_, 0, v___x_803_);
v___x_805_ = v_reuseFailAlloc_806_;
goto v_reusejp_804_;
}
v_reusejp_804_:
{
return v___x_805_;
}
}
}
case 8:
{
lean_object* v_condition_808_; lean_object* v_yes_809_; lean_object* v_no_810_; lean_object* v___x_812_; uint8_t v_isShared_813_; uint8_t v_isSharedCheck_820_; 
v_condition_808_ = lean_ctor_get(v_x_745_, 0);
v_yes_809_ = lean_ctor_get(v_x_745_, 1);
v_no_810_ = lean_ctor_get(v_x_745_, 2);
v_isSharedCheck_820_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_820_ == 0)
{
v___x_812_ = v_x_745_;
v_isShared_813_ = v_isSharedCheck_820_;
goto v_resetjp_811_;
}
else
{
lean_inc(v_no_810_);
lean_inc(v_yes_809_);
lean_inc(v_condition_808_);
lean_dec(v_x_745_);
v___x_812_ = lean_box(0);
v_isShared_813_ = v_isSharedCheck_820_;
goto v_resetjp_811_;
}
v_resetjp_811_:
{
lean_object* v___x_814_; lean_object* v___x_815_; lean_object* v___x_816_; lean_object* v___x_818_; 
v___x_814_ = lp_algalVerification_Algal_Source_canonExpr(v_condition_808_);
v___x_815_ = lp_algalVerification_Algal_Source_canonExpr(v_yes_809_);
v___x_816_ = lp_algalVerification_Algal_Source_canonExpr(v_no_810_);
if (v_isShared_813_ == 0)
{
lean_ctor_set(v___x_812_, 2, v___x_816_);
lean_ctor_set(v___x_812_, 1, v___x_815_);
lean_ctor_set(v___x_812_, 0, v___x_814_);
v___x_818_ = v___x_812_;
goto v_reusejp_817_;
}
else
{
lean_object* v_reuseFailAlloc_819_; 
v_reuseFailAlloc_819_ = lean_alloc_ctor(8, 3, 0);
lean_ctor_set(v_reuseFailAlloc_819_, 0, v___x_814_);
lean_ctor_set(v_reuseFailAlloc_819_, 1, v___x_815_);
lean_ctor_set(v_reuseFailAlloc_819_, 2, v___x_816_);
v___x_818_ = v_reuseFailAlloc_819_;
goto v_reusejp_817_;
}
v_reusejp_817_:
{
return v___x_818_;
}
}
}
case 9:
{
lean_object* v_value_821_; lean_object* v_arms_822_; lean_object* v___x_824_; uint8_t v_isShared_825_; uint8_t v_isSharedCheck_831_; 
v_value_821_ = lean_ctor_get(v_x_745_, 0);
v_arms_822_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_831_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_831_ == 0)
{
v___x_824_ = v_x_745_;
v_isShared_825_ = v_isSharedCheck_831_;
goto v_resetjp_823_;
}
else
{
lean_inc(v_arms_822_);
lean_inc(v_value_821_);
lean_dec(v_x_745_);
v___x_824_ = lean_box(0);
v_isShared_825_ = v_isSharedCheck_831_;
goto v_resetjp_823_;
}
v_resetjp_823_:
{
lean_object* v___x_826_; lean_object* v___x_827_; lean_object* v___x_829_; 
v___x_826_ = lp_algalVerification_Algal_Source_canonExpr(v_value_821_);
v___x_827_ = lp_algalVerification_Algal_Source_canonFields(v_arms_822_);
if (v_isShared_825_ == 0)
{
lean_ctor_set(v___x_824_, 1, v___x_827_);
lean_ctor_set(v___x_824_, 0, v___x_826_);
v___x_829_ = v___x_824_;
goto v_reusejp_828_;
}
else
{
lean_object* v_reuseFailAlloc_830_; 
v_reuseFailAlloc_830_ = lean_alloc_ctor(9, 2, 0);
lean_ctor_set(v_reuseFailAlloc_830_, 0, v___x_826_);
lean_ctor_set(v_reuseFailAlloc_830_, 1, v___x_827_);
v___x_829_ = v_reuseFailAlloc_830_;
goto v_reusejp_828_;
}
v_reusejp_828_:
{
return v___x_829_;
}
}
}
case 10:
{
lean_object* v_question_832_; lean_object* v_context_833_; lean_object* v_criteria_834_; lean_object* v___x_836_; uint8_t v_isShared_837_; uint8_t v_isSharedCheck_842_; 
v_question_832_ = lean_ctor_get(v_x_745_, 0);
v_context_833_ = lean_ctor_get(v_x_745_, 1);
v_criteria_834_ = lean_ctor_get(v_x_745_, 2);
v_isSharedCheck_842_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_842_ == 0)
{
v___x_836_ = v_x_745_;
v_isShared_837_ = v_isSharedCheck_842_;
goto v_resetjp_835_;
}
else
{
lean_inc(v_criteria_834_);
lean_inc(v_context_833_);
lean_inc(v_question_832_);
lean_dec(v_x_745_);
v___x_836_ = lean_box(0);
v_isShared_837_ = v_isSharedCheck_842_;
goto v_resetjp_835_;
}
v_resetjp_835_:
{
lean_object* v___x_838_; lean_object* v___x_840_; 
v___x_838_ = lp_algalVerification_Algal_Source_canonExpr(v_context_833_);
if (v_isShared_837_ == 0)
{
lean_ctor_set(v___x_836_, 1, v___x_838_);
v___x_840_ = v___x_836_;
goto v_reusejp_839_;
}
else
{
lean_object* v_reuseFailAlloc_841_; 
v_reuseFailAlloc_841_ = lean_alloc_ctor(10, 3, 0);
lean_ctor_set(v_reuseFailAlloc_841_, 0, v_question_832_);
lean_ctor_set(v_reuseFailAlloc_841_, 1, v___x_838_);
lean_ctor_set(v_reuseFailAlloc_841_, 2, v_criteria_834_);
v___x_840_ = v_reuseFailAlloc_841_;
goto v_reusejp_839_;
}
v_reusejp_839_:
{
return v___x_840_;
}
}
}
case 11:
{
lean_object* v_instruction_843_; lean_object* v_context_844_; lean_object* v___x_846_; uint8_t v_isShared_847_; uint8_t v_isSharedCheck_853_; 
v_instruction_843_ = lean_ctor_get(v_x_745_, 0);
v_context_844_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_853_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_853_ == 0)
{
v___x_846_ = v_x_745_;
v_isShared_847_ = v_isSharedCheck_853_;
goto v_resetjp_845_;
}
else
{
lean_inc(v_context_844_);
lean_inc(v_instruction_843_);
lean_dec(v_x_745_);
v___x_846_ = lean_box(0);
v_isShared_847_ = v_isSharedCheck_853_;
goto v_resetjp_845_;
}
v_resetjp_845_:
{
lean_object* v___x_848_; lean_object* v___x_849_; lean_object* v___x_851_; 
v___x_848_ = lp_algalVerification_Algal_Source_canonExpr(v_instruction_843_);
v___x_849_ = lp_algalVerification_Algal_Source_canonExpr(v_context_844_);
if (v_isShared_847_ == 0)
{
lean_ctor_set(v___x_846_, 1, v___x_849_);
lean_ctor_set(v___x_846_, 0, v___x_848_);
v___x_851_ = v___x_846_;
goto v_reusejp_850_;
}
else
{
lean_object* v_reuseFailAlloc_852_; 
v_reuseFailAlloc_852_ = lean_alloc_ctor(11, 2, 0);
lean_ctor_set(v_reuseFailAlloc_852_, 0, v___x_848_);
lean_ctor_set(v_reuseFailAlloc_852_, 1, v___x_849_);
v___x_851_ = v_reuseFailAlloc_852_;
goto v_reusejp_850_;
}
v_reusejp_850_:
{
return v___x_851_;
}
}
}
case 12:
{
lean_object* v_alias_854_; lean_object* v_args_855_; lean_object* v___x_857_; uint8_t v_isShared_858_; uint8_t v_isSharedCheck_863_; 
v_alias_854_ = lean_ctor_get(v_x_745_, 0);
v_args_855_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_863_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_863_ == 0)
{
v___x_857_ = v_x_745_;
v_isShared_858_ = v_isSharedCheck_863_;
goto v_resetjp_856_;
}
else
{
lean_inc(v_args_855_);
lean_inc(v_alias_854_);
lean_dec(v_x_745_);
v___x_857_ = lean_box(0);
v_isShared_858_ = v_isSharedCheck_863_;
goto v_resetjp_856_;
}
v_resetjp_856_:
{
lean_object* v___x_859_; lean_object* v___x_861_; 
v___x_859_ = lp_algalVerification_Algal_Source_canonFields(v_args_855_);
if (v_isShared_858_ == 0)
{
lean_ctor_set(v___x_857_, 1, v___x_859_);
v___x_861_ = v___x_857_;
goto v_reusejp_860_;
}
else
{
lean_object* v_reuseFailAlloc_862_; 
v_reuseFailAlloc_862_ = lean_alloc_ctor(12, 2, 0);
lean_ctor_set(v_reuseFailAlloc_862_, 0, v_alias_854_);
lean_ctor_set(v_reuseFailAlloc_862_, 1, v___x_859_);
v___x_861_ = v_reuseFailAlloc_862_;
goto v_reusejp_860_;
}
v_reusejp_860_:
{
return v___x_861_;
}
}
}
case 13:
{
lean_object* v_alias_864_; lean_object* v_over_865_; lean_object* v_items_866_; lean_object* v_args_867_; lean_object* v_maxItems_868_; lean_object* v___x_870_; uint8_t v_isShared_871_; uint8_t v_isSharedCheck_877_; 
v_alias_864_ = lean_ctor_get(v_x_745_, 0);
v_over_865_ = lean_ctor_get(v_x_745_, 1);
v_items_866_ = lean_ctor_get(v_x_745_, 2);
v_args_867_ = lean_ctor_get(v_x_745_, 3);
v_maxItems_868_ = lean_ctor_get(v_x_745_, 4);
v_isSharedCheck_877_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_877_ == 0)
{
v___x_870_ = v_x_745_;
v_isShared_871_ = v_isSharedCheck_877_;
goto v_resetjp_869_;
}
else
{
lean_inc(v_maxItems_868_);
lean_inc(v_args_867_);
lean_inc(v_items_866_);
lean_inc(v_over_865_);
lean_inc(v_alias_864_);
lean_dec(v_x_745_);
v___x_870_ = lean_box(0);
v_isShared_871_ = v_isSharedCheck_877_;
goto v_resetjp_869_;
}
v_resetjp_869_:
{
lean_object* v___x_872_; lean_object* v___x_873_; lean_object* v___x_875_; 
v___x_872_ = lp_algalVerification_Algal_Source_canonExpr(v_items_866_);
v___x_873_ = lp_algalVerification_Algal_Source_canonFields(v_args_867_);
if (v_isShared_871_ == 0)
{
lean_ctor_set(v___x_870_, 3, v___x_873_);
lean_ctor_set(v___x_870_, 2, v___x_872_);
v___x_875_ = v___x_870_;
goto v_reusejp_874_;
}
else
{
lean_object* v_reuseFailAlloc_876_; 
v_reuseFailAlloc_876_ = lean_alloc_ctor(13, 5, 0);
lean_ctor_set(v_reuseFailAlloc_876_, 0, v_alias_864_);
lean_ctor_set(v_reuseFailAlloc_876_, 1, v_over_865_);
lean_ctor_set(v_reuseFailAlloc_876_, 2, v___x_872_);
lean_ctor_set(v_reuseFailAlloc_876_, 3, v___x_873_);
lean_ctor_set(v_reuseFailAlloc_876_, 4, v_maxItems_868_);
v___x_875_ = v_reuseFailAlloc_876_;
goto v_reusejp_874_;
}
v_reusejp_874_:
{
return v___x_875_;
}
}
}
default: 
{
return v_x_745_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonList(lean_object* v_x_878_){
_start:
{
if (lean_obj_tag(v_x_878_) == 0)
{
return v_x_878_;
}
else
{
lean_object* v_head_879_; lean_object* v_tail_880_; lean_object* v___x_882_; uint8_t v_isShared_883_; uint8_t v_isSharedCheck_889_; 
v_head_879_ = lean_ctor_get(v_x_878_, 0);
v_tail_880_ = lean_ctor_get(v_x_878_, 1);
v_isSharedCheck_889_ = !lean_is_exclusive(v_x_878_);
if (v_isSharedCheck_889_ == 0)
{
v___x_882_ = v_x_878_;
v_isShared_883_ = v_isSharedCheck_889_;
goto v_resetjp_881_;
}
else
{
lean_inc(v_tail_880_);
lean_inc(v_head_879_);
lean_dec(v_x_878_);
v___x_882_ = lean_box(0);
v_isShared_883_ = v_isSharedCheck_889_;
goto v_resetjp_881_;
}
v_resetjp_881_:
{
lean_object* v___x_884_; lean_object* v___x_885_; lean_object* v___x_887_; 
v___x_884_ = lp_algalVerification_Algal_Source_canonExpr(v_head_879_);
v___x_885_ = lp_algalVerification_Algal_Source_canonList(v_tail_880_);
if (v_isShared_883_ == 0)
{
lean_ctor_set(v___x_882_, 1, v___x_885_);
lean_ctor_set(v___x_882_, 0, v___x_884_);
v___x_887_ = v___x_882_;
goto v_reusejp_886_;
}
else
{
lean_object* v_reuseFailAlloc_888_; 
v_reuseFailAlloc_888_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_888_, 0, v___x_884_);
lean_ctor_set(v_reuseFailAlloc_888_, 1, v___x_885_);
v___x_887_ = v_reuseFailAlloc_888_;
goto v_reusejp_886_;
}
v_reusejp_886_:
{
return v___x_887_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_canonProgram_spec__0(lean_object* v_a_890_, lean_object* v_a_891_){
_start:
{
if (lean_obj_tag(v_a_890_) == 0)
{
lean_object* v___x_892_; 
v___x_892_ = l_List_reverse___redArg(v_a_891_);
return v___x_892_;
}
else
{
lean_object* v_head_893_; lean_object* v_tail_894_; lean_object* v___x_896_; uint8_t v_isShared_897_; uint8_t v_isSharedCheck_912_; 
v_head_893_ = lean_ctor_get(v_a_890_, 0);
v_tail_894_ = lean_ctor_get(v_a_890_, 1);
v_isSharedCheck_912_ = !lean_is_exclusive(v_a_890_);
if (v_isSharedCheck_912_ == 0)
{
v___x_896_ = v_a_890_;
v_isShared_897_ = v_isSharedCheck_912_;
goto v_resetjp_895_;
}
else
{
lean_inc(v_tail_894_);
lean_inc(v_head_893_);
lean_dec(v_a_890_);
v___x_896_ = lean_box(0);
v_isShared_897_ = v_isSharedCheck_912_;
goto v_resetjp_895_;
}
v_resetjp_895_:
{
lean_object* v_fst_898_; lean_object* v_snd_899_; lean_object* v___x_901_; uint8_t v_isShared_902_; uint8_t v_isSharedCheck_911_; 
v_fst_898_ = lean_ctor_get(v_head_893_, 0);
v_snd_899_ = lean_ctor_get(v_head_893_, 1);
v_isSharedCheck_911_ = !lean_is_exclusive(v_head_893_);
if (v_isSharedCheck_911_ == 0)
{
v___x_901_ = v_head_893_;
v_isShared_902_ = v_isSharedCheck_911_;
goto v_resetjp_900_;
}
else
{
lean_inc(v_snd_899_);
lean_inc(v_fst_898_);
lean_dec(v_head_893_);
v___x_901_ = lean_box(0);
v_isShared_902_ = v_isSharedCheck_911_;
goto v_resetjp_900_;
}
v_resetjp_900_:
{
lean_object* v___x_903_; lean_object* v___x_905_; 
v___x_903_ = lp_algalVerification_Algal_Source_canonExpr(v_snd_899_);
if (v_isShared_902_ == 0)
{
lean_ctor_set(v___x_901_, 1, v___x_903_);
v___x_905_ = v___x_901_;
goto v_reusejp_904_;
}
else
{
lean_object* v_reuseFailAlloc_910_; 
v_reuseFailAlloc_910_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_910_, 0, v_fst_898_);
lean_ctor_set(v_reuseFailAlloc_910_, 1, v___x_903_);
v___x_905_ = v_reuseFailAlloc_910_;
goto v_reusejp_904_;
}
v_reusejp_904_:
{
lean_object* v___x_907_; 
if (v_isShared_897_ == 0)
{
lean_ctor_set(v___x_896_, 1, v_a_891_);
lean_ctor_set(v___x_896_, 0, v___x_905_);
v___x_907_ = v___x_896_;
goto v_reusejp_906_;
}
else
{
lean_object* v_reuseFailAlloc_909_; 
v_reuseFailAlloc_909_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_909_, 0, v___x_905_);
lean_ctor_set(v_reuseFailAlloc_909_, 1, v_a_891_);
v___x_907_ = v_reuseFailAlloc_909_;
goto v_reusejp_906_;
}
v_reusejp_906_:
{
v_a_890_ = v_tail_894_;
v_a_891_ = v___x_907_;
goto _start;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_canonProgram(lean_object* v_p_913_){
_start:
{
lean_object* v_name_914_; lean_object* v_parameters_915_; uint8_t v_output_916_; lean_object* v_bindings_917_; lean_object* v_result_918_; lean_object* v_budgets_919_; lean_object* v___x_921_; uint8_t v_isShared_922_; uint8_t v_isSharedCheck_929_; 
v_name_914_ = lean_ctor_get(v_p_913_, 0);
v_parameters_915_ = lean_ctor_get(v_p_913_, 1);
v_output_916_ = lean_ctor_get_uint8(v_p_913_, sizeof(void*)*5);
v_bindings_917_ = lean_ctor_get(v_p_913_, 2);
v_result_918_ = lean_ctor_get(v_p_913_, 3);
v_budgets_919_ = lean_ctor_get(v_p_913_, 4);
v_isSharedCheck_929_ = !lean_is_exclusive(v_p_913_);
if (v_isSharedCheck_929_ == 0)
{
v___x_921_ = v_p_913_;
v_isShared_922_ = v_isSharedCheck_929_;
goto v_resetjp_920_;
}
else
{
lean_inc(v_budgets_919_);
lean_inc(v_result_918_);
lean_inc(v_bindings_917_);
lean_inc(v_parameters_915_);
lean_inc(v_name_914_);
lean_dec(v_p_913_);
v___x_921_ = lean_box(0);
v_isShared_922_ = v_isSharedCheck_929_;
goto v_resetjp_920_;
}
v_resetjp_920_:
{
lean_object* v___x_923_; lean_object* v___x_924_; lean_object* v___x_925_; lean_object* v___x_927_; 
v___x_923_ = lean_box(0);
v___x_924_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_canonProgram_spec__0(v_bindings_917_, v___x_923_);
v___x_925_ = lp_algalVerification_Algal_Source_canonExpr(v_result_918_);
if (v_isShared_922_ == 0)
{
lean_ctor_set(v___x_921_, 3, v___x_925_);
lean_ctor_set(v___x_921_, 2, v___x_924_);
v___x_927_ = v___x_921_;
goto v_reusejp_926_;
}
else
{
lean_object* v_reuseFailAlloc_928_; 
v_reuseFailAlloc_928_ = lean_alloc_ctor(0, 5, 1);
lean_ctor_set(v_reuseFailAlloc_928_, 0, v_name_914_);
lean_ctor_set(v_reuseFailAlloc_928_, 1, v_parameters_915_);
lean_ctor_set(v_reuseFailAlloc_928_, 2, v___x_924_);
lean_ctor_set(v_reuseFailAlloc_928_, 3, v___x_925_);
lean_ctor_set(v_reuseFailAlloc_928_, 4, v_budgets_919_);
lean_ctor_set_uint8(v_reuseFailAlloc_928_, sizeof(void*)*5, v_output_916_);
v___x_927_ = v_reuseFailAlloc_928_;
goto v_reusejp_926_;
}
v_reusejp_926_:
{
return v___x_927_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalRecordEntries(lean_object* v_x_937_, lean_object* v_x_938_){
_start:
{
if (lean_obj_tag(v_x_937_) == 0)
{
lean_object* v___x_939_; 
v___x_939_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalRecordEntries___closed__0));
return v___x_939_;
}
else
{
lean_object* v_head_940_; lean_object* v_tail_941_; lean_object* v___x_943_; uint8_t v_isShared_944_; uint8_t v_isSharedCheck_977_; 
v_head_940_ = lean_ctor_get(v_x_937_, 0);
v_tail_941_ = lean_ctor_get(v_x_937_, 1);
v_isSharedCheck_977_ = !lean_is_exclusive(v_x_937_);
if (v_isSharedCheck_977_ == 0)
{
v___x_943_ = v_x_937_;
v_isShared_944_ = v_isSharedCheck_977_;
goto v_resetjp_942_;
}
else
{
lean_inc(v_tail_941_);
lean_inc(v_head_940_);
lean_dec(v_x_937_);
v___x_943_ = lean_box(0);
v_isShared_944_ = v_isSharedCheck_977_;
goto v_resetjp_942_;
}
v_resetjp_942_:
{
lean_object* v_fst_945_; lean_object* v_snd_946_; lean_object* v___x_948_; uint8_t v_isShared_949_; uint8_t v_isSharedCheck_976_; 
v_fst_945_ = lean_ctor_get(v_head_940_, 0);
v_snd_946_ = lean_ctor_get(v_head_940_, 1);
v_isSharedCheck_976_ = !lean_is_exclusive(v_head_940_);
if (v_isSharedCheck_976_ == 0)
{
v___x_948_ = v_head_940_;
v_isShared_949_ = v_isSharedCheck_976_;
goto v_resetjp_947_;
}
else
{
lean_inc(v_snd_946_);
lean_inc(v_fst_945_);
lean_dec(v_head_940_);
v___x_948_ = lean_box(0);
v_isShared_949_ = v_isSharedCheck_976_;
goto v_resetjp_947_;
}
v_resetjp_947_:
{
lean_object* v___x_950_; 
v___x_950_ = lp_algalVerification_Algal_Source_evalExpr(v_snd_946_, v_x_938_);
switch(lean_obj_tag(v___x_950_))
{
case 0:
{
lean_object* v_value_951_; lean_object* v___x_952_; 
v_value_951_ = lean_ctor_get(v___x_950_, 0);
lean_inc(v_value_951_);
lean_dec_ref_known(v___x_950_, 1);
v___x_952_ = lp_algalVerification_Algal_Source_evalRecordEntries(v_tail_941_, v_x_938_);
if (lean_obj_tag(v___x_952_) == 0)
{
lean_object* v_value_953_; lean_object* v___x_955_; uint8_t v_isShared_956_; uint8_t v_isSharedCheck_966_; 
v_value_953_ = lean_ctor_get(v___x_952_, 0);
v_isSharedCheck_966_ = !lean_is_exclusive(v___x_952_);
if (v_isSharedCheck_966_ == 0)
{
v___x_955_ = v___x_952_;
v_isShared_956_ = v_isSharedCheck_966_;
goto v_resetjp_954_;
}
else
{
lean_inc(v_value_953_);
lean_dec(v___x_952_);
v___x_955_ = lean_box(0);
v_isShared_956_ = v_isSharedCheck_966_;
goto v_resetjp_954_;
}
v_resetjp_954_:
{
lean_object* v___x_958_; 
if (v_isShared_949_ == 0)
{
lean_ctor_set(v___x_948_, 1, v_value_951_);
v___x_958_ = v___x_948_;
goto v_reusejp_957_;
}
else
{
lean_object* v_reuseFailAlloc_965_; 
v_reuseFailAlloc_965_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_965_, 0, v_fst_945_);
lean_ctor_set(v_reuseFailAlloc_965_, 1, v_value_951_);
v___x_958_ = v_reuseFailAlloc_965_;
goto v_reusejp_957_;
}
v_reusejp_957_:
{
lean_object* v___x_960_; 
if (v_isShared_944_ == 0)
{
lean_ctor_set(v___x_943_, 1, v_value_953_);
lean_ctor_set(v___x_943_, 0, v___x_958_);
v___x_960_ = v___x_943_;
goto v_reusejp_959_;
}
else
{
lean_object* v_reuseFailAlloc_964_; 
v_reuseFailAlloc_964_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_964_, 0, v___x_958_);
lean_ctor_set(v_reuseFailAlloc_964_, 1, v_value_953_);
v___x_960_ = v_reuseFailAlloc_964_;
goto v_reusejp_959_;
}
v_reusejp_959_:
{
lean_object* v___x_962_; 
if (v_isShared_956_ == 0)
{
lean_ctor_set(v___x_955_, 0, v___x_960_);
v___x_962_ = v___x_955_;
goto v_reusejp_961_;
}
else
{
lean_object* v_reuseFailAlloc_963_; 
v_reuseFailAlloc_963_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_963_, 0, v___x_960_);
v___x_962_ = v_reuseFailAlloc_963_;
goto v_reusejp_961_;
}
v_reusejp_961_:
{
return v___x_962_;
}
}
}
}
}
else
{
lean_dec(v_value_951_);
lean_del_object(v___x_948_);
lean_dec(v_fst_945_);
lean_del_object(v___x_943_);
return v___x_952_;
}
}
case 1:
{
lean_object* v___x_967_; 
lean_del_object(v___x_948_);
lean_dec(v_fst_945_);
lean_del_object(v___x_943_);
lean_dec(v_tail_941_);
v___x_967_ = lean_box(1);
return v___x_967_;
}
default: 
{
uint8_t v_e_968_; lean_object* v___x_970_; uint8_t v_isShared_971_; uint8_t v_isSharedCheck_975_; 
lean_del_object(v___x_948_);
lean_dec(v_fst_945_);
lean_del_object(v___x_943_);
lean_dec(v_tail_941_);
v_e_968_ = lean_ctor_get_uint8(v___x_950_, 0);
v_isSharedCheck_975_ = !lean_is_exclusive(v___x_950_);
if (v_isSharedCheck_975_ == 0)
{
v___x_970_ = v___x_950_;
v_isShared_971_ = v_isSharedCheck_975_;
goto v_resetjp_969_;
}
else
{
lean_dec(v___x_950_);
v___x_970_ = lean_box(0);
v_isShared_971_ = v_isSharedCheck_975_;
goto v_resetjp_969_;
}
v_resetjp_969_:
{
lean_object* v___x_973_; 
if (v_isShared_971_ == 0)
{
v___x_973_ = v___x_970_;
goto v_reusejp_972_;
}
else
{
lean_object* v_reuseFailAlloc_974_; 
v_reuseFailAlloc_974_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_974_, 0, v_e_968_);
v___x_973_ = v_reuseFailAlloc_974_;
goto v_reusejp_972_;
}
v_reusejp_972_:
{
return v___x_973_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalItems(lean_object* v_x_980_, lean_object* v_x_981_){
_start:
{
if (lean_obj_tag(v_x_980_) == 0)
{
lean_object* v___x_982_; 
v___x_982_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalItems___closed__0));
return v___x_982_;
}
else
{
lean_object* v_head_983_; lean_object* v_tail_984_; lean_object* v___x_986_; uint8_t v_isShared_987_; uint8_t v_isSharedCheck_1011_; 
v_head_983_ = lean_ctor_get(v_x_980_, 0);
v_tail_984_ = lean_ctor_get(v_x_980_, 1);
v_isSharedCheck_1011_ = !lean_is_exclusive(v_x_980_);
if (v_isSharedCheck_1011_ == 0)
{
v___x_986_ = v_x_980_;
v_isShared_987_ = v_isSharedCheck_1011_;
goto v_resetjp_985_;
}
else
{
lean_inc(v_tail_984_);
lean_inc(v_head_983_);
lean_dec(v_x_980_);
v___x_986_ = lean_box(0);
v_isShared_987_ = v_isSharedCheck_1011_;
goto v_resetjp_985_;
}
v_resetjp_985_:
{
lean_object* v___x_988_; 
v___x_988_ = lp_algalVerification_Algal_Source_evalExpr(v_head_983_, v_x_981_);
switch(lean_obj_tag(v___x_988_))
{
case 0:
{
lean_object* v_value_989_; lean_object* v___x_990_; 
v_value_989_ = lean_ctor_get(v___x_988_, 0);
lean_inc(v_value_989_);
lean_dec_ref_known(v___x_988_, 1);
v___x_990_ = lp_algalVerification_Algal_Source_evalItems(v_tail_984_, v_x_981_);
if (lean_obj_tag(v___x_990_) == 0)
{
lean_object* v_value_991_; lean_object* v___x_993_; uint8_t v_isShared_994_; uint8_t v_isSharedCheck_1001_; 
v_value_991_ = lean_ctor_get(v___x_990_, 0);
v_isSharedCheck_1001_ = !lean_is_exclusive(v___x_990_);
if (v_isSharedCheck_1001_ == 0)
{
v___x_993_ = v___x_990_;
v_isShared_994_ = v_isSharedCheck_1001_;
goto v_resetjp_992_;
}
else
{
lean_inc(v_value_991_);
lean_dec(v___x_990_);
v___x_993_ = lean_box(0);
v_isShared_994_ = v_isSharedCheck_1001_;
goto v_resetjp_992_;
}
v_resetjp_992_:
{
lean_object* v___x_996_; 
if (v_isShared_987_ == 0)
{
lean_ctor_set(v___x_986_, 1, v_value_991_);
lean_ctor_set(v___x_986_, 0, v_value_989_);
v___x_996_ = v___x_986_;
goto v_reusejp_995_;
}
else
{
lean_object* v_reuseFailAlloc_1000_; 
v_reuseFailAlloc_1000_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1000_, 0, v_value_989_);
lean_ctor_set(v_reuseFailAlloc_1000_, 1, v_value_991_);
v___x_996_ = v_reuseFailAlloc_1000_;
goto v_reusejp_995_;
}
v_reusejp_995_:
{
lean_object* v___x_998_; 
if (v_isShared_994_ == 0)
{
lean_ctor_set(v___x_993_, 0, v___x_996_);
v___x_998_ = v___x_993_;
goto v_reusejp_997_;
}
else
{
lean_object* v_reuseFailAlloc_999_; 
v_reuseFailAlloc_999_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_999_, 0, v___x_996_);
v___x_998_ = v_reuseFailAlloc_999_;
goto v_reusejp_997_;
}
v_reusejp_997_:
{
return v___x_998_;
}
}
}
}
else
{
lean_dec(v_value_989_);
lean_del_object(v___x_986_);
return v___x_990_;
}
}
case 1:
{
lean_object* v___x_1002_; 
lean_del_object(v___x_986_);
lean_dec(v_tail_984_);
v___x_1002_ = lean_box(1);
return v___x_1002_;
}
default: 
{
uint8_t v_e_1003_; lean_object* v___x_1005_; uint8_t v_isShared_1006_; uint8_t v_isSharedCheck_1010_; 
lean_del_object(v___x_986_);
lean_dec(v_tail_984_);
v_e_1003_ = lean_ctor_get_uint8(v___x_988_, 0);
v_isSharedCheck_1010_ = !lean_is_exclusive(v___x_988_);
if (v_isSharedCheck_1010_ == 0)
{
v___x_1005_ = v___x_988_;
v_isShared_1006_ = v_isSharedCheck_1010_;
goto v_resetjp_1004_;
}
else
{
lean_dec(v___x_988_);
v___x_1005_ = lean_box(0);
v_isShared_1006_ = v_isSharedCheck_1010_;
goto v_resetjp_1004_;
}
v_resetjp_1004_:
{
lean_object* v___x_1008_; 
if (v_isShared_1006_ == 0)
{
v___x_1008_ = v___x_1005_;
goto v_reusejp_1007_;
}
else
{
lean_object* v_reuseFailAlloc_1009_; 
v_reuseFailAlloc_1009_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1009_, 0, v_e_1003_);
v___x_1008_ = v_reuseFailAlloc_1009_;
goto v_reusejp_1007_;
}
v_reusejp_1007_:
{
return v___x_1008_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalExpr(lean_object* v_x_1012_, lean_object* v_x_1013_){
_start:
{
uint8_t v___y_1015_; 
switch(lean_obj_tag(v_x_1012_))
{
case 0:
{
lean_object* v_value_1018_; lean_object* v___x_1020_; uint8_t v_isShared_1021_; uint8_t v_isSharedCheck_1025_; 
v_value_1018_ = lean_ctor_get(v_x_1012_, 0);
v_isSharedCheck_1025_ = !lean_is_exclusive(v_x_1012_);
if (v_isSharedCheck_1025_ == 0)
{
v___x_1020_ = v_x_1012_;
v_isShared_1021_ = v_isSharedCheck_1025_;
goto v_resetjp_1019_;
}
else
{
lean_inc(v_value_1018_);
lean_dec(v_x_1012_);
v___x_1020_ = lean_box(0);
v_isShared_1021_ = v_isSharedCheck_1025_;
goto v_resetjp_1019_;
}
v_resetjp_1019_:
{
lean_object* v___x_1023_; 
if (v_isShared_1021_ == 0)
{
v___x_1023_ = v___x_1020_;
goto v_reusejp_1022_;
}
else
{
lean_object* v_reuseFailAlloc_1024_; 
v_reuseFailAlloc_1024_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1024_, 0, v_value_1018_);
v___x_1023_ = v_reuseFailAlloc_1024_;
goto v_reusejp_1022_;
}
v_reusejp_1022_:
{
return v___x_1023_;
}
}
}
case 1:
{
lean_object* v_n_1026_; lean_object* v___x_1027_; 
v_n_1026_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_n_1026_);
lean_dec_ref_known(v_x_1012_, 1);
v___x_1027_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_n_1026_, v_x_1013_);
lean_dec_ref(v_n_1026_);
if (lean_obj_tag(v___x_1027_) == 0)
{
lean_object* v___x_1028_; 
v___x_1028_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1028_;
}
else
{
lean_object* v_val_1029_; 
v_val_1029_ = lean_ctor_get(v___x_1027_, 0);
lean_inc(v_val_1029_);
lean_dec_ref_known(v___x_1027_, 1);
if (lean_obj_tag(v_val_1029_) == 0)
{
lean_object* v___x_1030_; 
v___x_1030_ = lean_box(1);
return v___x_1030_;
}
else
{
lean_object* v_val_1031_; lean_object* v___x_1033_; uint8_t v_isShared_1034_; uint8_t v_isSharedCheck_1038_; 
v_val_1031_ = lean_ctor_get(v_val_1029_, 0);
v_isSharedCheck_1038_ = !lean_is_exclusive(v_val_1029_);
if (v_isSharedCheck_1038_ == 0)
{
v___x_1033_ = v_val_1029_;
v_isShared_1034_ = v_isSharedCheck_1038_;
goto v_resetjp_1032_;
}
else
{
lean_inc(v_val_1031_);
lean_dec(v_val_1029_);
v___x_1033_ = lean_box(0);
v_isShared_1034_ = v_isSharedCheck_1038_;
goto v_resetjp_1032_;
}
v_resetjp_1032_:
{
lean_object* v___x_1036_; 
if (v_isShared_1034_ == 0)
{
lean_ctor_set_tag(v___x_1033_, 0);
v___x_1036_ = v___x_1033_;
goto v_reusejp_1035_;
}
else
{
lean_object* v_reuseFailAlloc_1037_; 
v_reuseFailAlloc_1037_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1037_, 0, v_val_1031_);
v___x_1036_ = v_reuseFailAlloc_1037_;
goto v_reusejp_1035_;
}
v_reusejp_1035_:
{
return v___x_1036_;
}
}
}
}
}
case 2:
{
lean_object* v_value_1039_; lean_object* v_name_1040_; lean_object* v___x_1041_; 
v_value_1039_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_value_1039_);
v_name_1040_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_name_1040_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1041_ = lp_algalVerification_Algal_Source_evalExpr(v_value_1039_, v_x_1013_);
if (lean_obj_tag(v___x_1041_) == 0)
{
lean_object* v_value_1042_; lean_object* v___x_1044_; uint8_t v_isShared_1045_; uint8_t v_isSharedCheck_1052_; 
v_value_1042_ = lean_ctor_get(v___x_1041_, 0);
v_isSharedCheck_1052_ = !lean_is_exclusive(v___x_1041_);
if (v_isSharedCheck_1052_ == 0)
{
v___x_1044_ = v___x_1041_;
v_isShared_1045_ = v_isSharedCheck_1052_;
goto v_resetjp_1043_;
}
else
{
lean_inc(v_value_1042_);
lean_dec(v___x_1041_);
v___x_1044_ = lean_box(0);
v_isShared_1045_ = v_isSharedCheck_1052_;
goto v_resetjp_1043_;
}
v_resetjp_1043_:
{
lean_object* v___x_1046_; 
v___x_1046_ = lp_algalVerification_Algal_Source_getField(v_value_1042_, v_name_1040_);
lean_dec_ref(v_name_1040_);
if (lean_obj_tag(v___x_1046_) == 0)
{
lean_object* v___x_1047_; 
lean_dec_ref_known(v___x_1046_, 1);
lean_del_object(v___x_1044_);
v___x_1047_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1047_;
}
else
{
lean_object* v_a_1048_; lean_object* v___x_1050_; 
v_a_1048_ = lean_ctor_get(v___x_1046_, 0);
lean_inc(v_a_1048_);
lean_dec_ref_known(v___x_1046_, 1);
if (v_isShared_1045_ == 0)
{
lean_ctor_set(v___x_1044_, 0, v_a_1048_);
v___x_1050_ = v___x_1044_;
goto v_reusejp_1049_;
}
else
{
lean_object* v_reuseFailAlloc_1051_; 
v_reuseFailAlloc_1051_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1051_, 0, v_a_1048_);
v___x_1050_ = v_reuseFailAlloc_1051_;
goto v_reusejp_1049_;
}
v_reusejp_1049_:
{
return v___x_1050_;
}
}
}
}
else
{
lean_dec_ref(v_name_1040_);
return v___x_1041_;
}
}
case 3:
{
lean_object* v_value_1053_; lean_object* v_label_1054_; lean_object* v___x_1055_; 
v_value_1053_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_value_1053_);
v_label_1054_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_label_1054_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1055_ = lp_algalVerification_Algal_Source_evalExpr(v_label_1054_, v_x_1013_);
if (lean_obj_tag(v___x_1055_) == 0)
{
lean_object* v_value_1056_; 
v_value_1056_ = lean_ctor_get(v___x_1055_, 0);
lean_inc(v_value_1056_);
lean_dec_ref_known(v___x_1055_, 1);
if (lean_obj_tag(v_value_1056_) == 3)
{
lean_object* v_value_1057_; lean_object* v___x_1058_; 
v_value_1057_ = lean_ctor_get(v_value_1056_, 0);
lean_inc_ref(v_value_1057_);
lean_dec_ref_known(v_value_1056_, 1);
v___x_1058_ = lp_algalVerification_Algal_Source_evalExpr(v_value_1053_, v_x_1013_);
if (lean_obj_tag(v___x_1058_) == 0)
{
lean_object* v_value_1059_; lean_object* v___x_1061_; uint8_t v_isShared_1062_; uint8_t v_isSharedCheck_1073_; 
v_value_1059_ = lean_ctor_get(v___x_1058_, 0);
v_isSharedCheck_1073_ = !lean_is_exclusive(v___x_1058_);
if (v_isSharedCheck_1073_ == 0)
{
v___x_1061_ = v___x_1058_;
v_isShared_1062_ = v_isSharedCheck_1073_;
goto v_resetjp_1060_;
}
else
{
lean_inc(v_value_1059_);
lean_dec(v___x_1058_);
v___x_1061_ = lean_box(0);
v_isShared_1062_ = v_isSharedCheck_1073_;
goto v_resetjp_1060_;
}
v_resetjp_1060_:
{
lean_object* v___x_1063_; lean_object* v___x_1064_; 
v___x_1063_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__1));
v___x_1064_ = lp_algalVerification_Algal_Source_getField(v_value_1059_, v___x_1063_);
if (lean_obj_tag(v___x_1064_) == 0)
{
lean_object* v___x_1065_; 
lean_dec_ref_known(v___x_1064_, 1);
lean_del_object(v___x_1061_);
lean_dec_ref(v_value_1057_);
v___x_1065_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1065_;
}
else
{
lean_object* v_a_1066_; lean_object* v___x_1067_; 
v_a_1066_ = lean_ctor_get(v___x_1064_, 0);
lean_inc(v_a_1066_);
lean_dec_ref_known(v___x_1064_, 1);
v___x_1067_ = lp_algalVerification_Algal_Source_getField(v_a_1066_, v_value_1057_);
lean_dec_ref(v_value_1057_);
if (lean_obj_tag(v___x_1067_) == 0)
{
lean_object* v___x_1068_; 
lean_dec_ref_known(v___x_1067_, 1);
lean_del_object(v___x_1061_);
v___x_1068_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1068_;
}
else
{
lean_object* v_a_1069_; lean_object* v___x_1071_; 
v_a_1069_ = lean_ctor_get(v___x_1067_, 0);
lean_inc(v_a_1069_);
lean_dec_ref_known(v___x_1067_, 1);
if (v_isShared_1062_ == 0)
{
lean_ctor_set(v___x_1061_, 0, v_a_1069_);
v___x_1071_ = v___x_1061_;
goto v_reusejp_1070_;
}
else
{
lean_object* v_reuseFailAlloc_1072_; 
v_reuseFailAlloc_1072_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1072_, 0, v_a_1069_);
v___x_1071_ = v_reuseFailAlloc_1072_;
goto v_reusejp_1070_;
}
v_reusejp_1070_:
{
return v___x_1071_;
}
}
}
}
}
else
{
lean_dec_ref(v_value_1057_);
return v___x_1058_;
}
}
else
{
lean_object* v___x_1074_; 
lean_dec(v_value_1056_);
lean_dec_ref(v_value_1053_);
v___x_1074_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1074_;
}
}
else
{
lean_dec_ref(v_value_1053_);
return v___x_1055_;
}
}
case 4:
{
uint8_t v_op_1075_; lean_object* v_value_1076_; lean_object* v___x_1077_; 
v_op_1075_ = lean_ctor_get_uint8(v_x_1012_, sizeof(void*)*1);
v_value_1076_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_value_1076_);
lean_dec_ref_known(v_x_1012_, 1);
v___x_1077_ = lp_algalVerification_Algal_Source_evalExpr(v_value_1076_, v_x_1013_);
if (lean_obj_tag(v___x_1077_) == 0)
{
if (v_op_1075_ == 0)
{
lean_object* v_value_1078_; lean_object* v___x_1079_; 
v_value_1078_ = lean_ctor_get(v___x_1077_, 0);
lean_inc(v_value_1078_);
lean_dec_ref_known(v___x_1077_, 1);
v___x_1079_ = lp_algalVerification_Algal_Source_truthy(v_value_1078_);
lean_dec(v_value_1078_);
if (lean_obj_tag(v___x_1079_) == 0)
{
lean_object* v___x_1080_; 
lean_dec_ref_known(v___x_1079_, 1);
v___x_1080_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1080_;
}
else
{
lean_object* v_a_1081_; uint8_t v___x_1082_; 
v_a_1081_ = lean_ctor_get(v___x_1079_, 0);
lean_inc(v_a_1081_);
lean_dec_ref_known(v___x_1079_, 1);
v___x_1082_ = lean_unbox(v_a_1081_);
lean_dec(v_a_1081_);
if (v___x_1082_ == 0)
{
uint8_t v___x_1083_; 
v___x_1083_ = 1;
v___y_1015_ = v___x_1083_;
goto v___jp_1014_;
}
else
{
uint8_t v___x_1084_; 
v___x_1084_ = 0;
v___y_1015_ = v___x_1084_;
goto v___jp_1014_;
}
}
}
else
{
lean_object* v_value_1085_; lean_object* v___x_1087_; uint8_t v_isShared_1088_; uint8_t v_isSharedCheck_1099_; 
v_value_1085_ = lean_ctor_get(v___x_1077_, 0);
v_isSharedCheck_1099_ = !lean_is_exclusive(v___x_1077_);
if (v_isSharedCheck_1099_ == 0)
{
v___x_1087_ = v___x_1077_;
v_isShared_1088_ = v_isSharedCheck_1099_;
goto v_resetjp_1086_;
}
else
{
lean_inc(v_value_1085_);
lean_dec(v___x_1077_);
v___x_1087_ = lean_box(0);
v_isShared_1088_ = v_isSharedCheck_1099_;
goto v_resetjp_1086_;
}
v_resetjp_1086_:
{
if (lean_obj_tag(v_value_1085_) == 2)
{
uint64_t v_value_1089_; double v___x_1090_; double v___x_1091_; lean_object* v___x_1092_; 
v_value_1089_ = lean_ctor_get_uint64(v_value_1085_, 0);
lean_dec_ref_known(v_value_1085_, 0);
v___x_1090_ = lean_float_of_bits(v_value_1089_);
v___x_1091_ = lean_float_negate(v___x_1090_);
v___x_1092_ = lp_algalVerification_Algal_Source_numOfFloat(v___x_1091_);
if (lean_obj_tag(v___x_1092_) == 0)
{
lean_object* v___x_1093_; 
lean_dec_ref_known(v___x_1092_, 1);
lean_del_object(v___x_1087_);
v___x_1093_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1093_;
}
else
{
lean_object* v_a_1094_; lean_object* v___x_1096_; 
v_a_1094_ = lean_ctor_get(v___x_1092_, 0);
lean_inc(v_a_1094_);
lean_dec_ref_known(v___x_1092_, 1);
if (v_isShared_1088_ == 0)
{
lean_ctor_set(v___x_1087_, 0, v_a_1094_);
v___x_1096_ = v___x_1087_;
goto v_reusejp_1095_;
}
else
{
lean_object* v_reuseFailAlloc_1097_; 
v_reuseFailAlloc_1097_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1097_, 0, v_a_1094_);
v___x_1096_ = v_reuseFailAlloc_1097_;
goto v_reusejp_1095_;
}
v_reusejp_1095_:
{
return v___x_1096_;
}
}
}
else
{
lean_object* v___x_1098_; 
lean_del_object(v___x_1087_);
lean_dec(v_value_1085_);
v___x_1098_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1098_;
}
}
}
}
else
{
return v___x_1077_;
}
}
case 5:
{
uint8_t v_op_1100_; 
v_op_1100_ = lean_ctor_get_uint8(v_x_1012_, sizeof(void*)*2);
switch(v_op_1100_)
{
case 11:
{
lean_object* v_left_1101_; lean_object* v_right_1102_; lean_object* v___x_1103_; 
v_left_1101_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_left_1101_);
v_right_1102_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_right_1102_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1103_ = lp_algalVerification_Algal_Source_evalExpr(v_left_1101_, v_x_1013_);
if (lean_obj_tag(v___x_1103_) == 0)
{
lean_object* v_value_1104_; lean_object* v___x_1106_; uint8_t v_isShared_1107_; uint8_t v_isSharedCheck_1118_; 
v_value_1104_ = lean_ctor_get(v___x_1103_, 0);
v_isSharedCheck_1118_ = !lean_is_exclusive(v___x_1103_);
if (v_isSharedCheck_1118_ == 0)
{
v___x_1106_ = v___x_1103_;
v_isShared_1107_ = v_isSharedCheck_1118_;
goto v_resetjp_1105_;
}
else
{
lean_inc(v_value_1104_);
lean_dec(v___x_1103_);
v___x_1106_ = lean_box(0);
v_isShared_1107_ = v_isSharedCheck_1118_;
goto v_resetjp_1105_;
}
v_resetjp_1105_:
{
lean_object* v___x_1108_; 
v___x_1108_ = lp_algalVerification_Algal_Source_truthy(v_value_1104_);
lean_dec(v_value_1104_);
if (lean_obj_tag(v___x_1108_) == 0)
{
lean_object* v___x_1109_; 
lean_dec_ref_known(v___x_1108_, 1);
lean_del_object(v___x_1106_);
lean_dec_ref(v_right_1102_);
v___x_1109_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1109_;
}
else
{
lean_object* v_a_1110_; uint8_t v___x_1111_; 
v_a_1110_ = lean_ctor_get(v___x_1108_, 0);
lean_inc(v_a_1110_);
lean_dec_ref_known(v___x_1108_, 1);
v___x_1111_ = lean_unbox(v_a_1110_);
if (v___x_1111_ == 0)
{
lean_object* v___x_1112_; uint8_t v___x_1113_; lean_object* v___x_1115_; 
lean_dec_ref(v_right_1102_);
v___x_1112_ = lean_alloc_ctor(1, 0, 1);
v___x_1113_ = lean_unbox(v_a_1110_);
lean_dec(v_a_1110_);
lean_ctor_set_uint8(v___x_1112_, 0, v___x_1113_);
if (v_isShared_1107_ == 0)
{
lean_ctor_set(v___x_1106_, 0, v___x_1112_);
v___x_1115_ = v___x_1106_;
goto v_reusejp_1114_;
}
else
{
lean_object* v_reuseFailAlloc_1116_; 
v_reuseFailAlloc_1116_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1116_, 0, v___x_1112_);
v___x_1115_ = v_reuseFailAlloc_1116_;
goto v_reusejp_1114_;
}
v_reusejp_1114_:
{
return v___x_1115_;
}
}
else
{
lean_dec(v_a_1110_);
lean_del_object(v___x_1106_);
v_x_1012_ = v_right_1102_;
goto _start;
}
}
}
}
else
{
lean_dec_ref(v_right_1102_);
return v___x_1103_;
}
}
case 12:
{
lean_object* v_left_1119_; lean_object* v_right_1120_; lean_object* v___x_1121_; 
v_left_1119_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_left_1119_);
v_right_1120_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_right_1120_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1121_ = lp_algalVerification_Algal_Source_evalExpr(v_left_1119_, v_x_1013_);
if (lean_obj_tag(v___x_1121_) == 0)
{
lean_object* v_value_1122_; lean_object* v___x_1124_; uint8_t v_isShared_1125_; uint8_t v_isSharedCheck_1136_; 
v_value_1122_ = lean_ctor_get(v___x_1121_, 0);
v_isSharedCheck_1136_ = !lean_is_exclusive(v___x_1121_);
if (v_isSharedCheck_1136_ == 0)
{
v___x_1124_ = v___x_1121_;
v_isShared_1125_ = v_isSharedCheck_1136_;
goto v_resetjp_1123_;
}
else
{
lean_inc(v_value_1122_);
lean_dec(v___x_1121_);
v___x_1124_ = lean_box(0);
v_isShared_1125_ = v_isSharedCheck_1136_;
goto v_resetjp_1123_;
}
v_resetjp_1123_:
{
lean_object* v___x_1126_; 
v___x_1126_ = lp_algalVerification_Algal_Source_truthy(v_value_1122_);
lean_dec(v_value_1122_);
if (lean_obj_tag(v___x_1126_) == 0)
{
lean_object* v___x_1127_; 
lean_dec_ref_known(v___x_1126_, 1);
lean_del_object(v___x_1124_);
lean_dec_ref(v_right_1120_);
v___x_1127_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1127_;
}
else
{
lean_object* v_a_1128_; uint8_t v___x_1129_; 
v_a_1128_ = lean_ctor_get(v___x_1126_, 0);
lean_inc(v_a_1128_);
lean_dec_ref_known(v___x_1126_, 1);
v___x_1129_ = lean_unbox(v_a_1128_);
if (v___x_1129_ == 0)
{
lean_dec(v_a_1128_);
lean_del_object(v___x_1124_);
v_x_1012_ = v_right_1120_;
goto _start;
}
else
{
lean_object* v___x_1131_; uint8_t v___x_1132_; lean_object* v___x_1134_; 
lean_dec_ref(v_right_1120_);
v___x_1131_ = lean_alloc_ctor(1, 0, 1);
v___x_1132_ = lean_unbox(v_a_1128_);
lean_dec(v_a_1128_);
lean_ctor_set_uint8(v___x_1131_, 0, v___x_1132_);
if (v_isShared_1125_ == 0)
{
lean_ctor_set(v___x_1124_, 0, v___x_1131_);
v___x_1134_ = v___x_1124_;
goto v_reusejp_1133_;
}
else
{
lean_object* v_reuseFailAlloc_1135_; 
v_reuseFailAlloc_1135_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1135_, 0, v___x_1131_);
v___x_1134_ = v_reuseFailAlloc_1135_;
goto v_reusejp_1133_;
}
v_reusejp_1133_:
{
return v___x_1134_;
}
}
}
}
}
else
{
lean_dec_ref(v_right_1120_);
return v___x_1121_;
}
}
default: 
{
lean_object* v_left_1137_; lean_object* v_right_1138_; lean_object* v___x_1139_; 
v_left_1137_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_left_1137_);
v_right_1138_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_right_1138_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1139_ = lp_algalVerification_Algal_Source_evalExpr(v_left_1137_, v_x_1013_);
if (lean_obj_tag(v___x_1139_) == 0)
{
lean_object* v_value_1140_; lean_object* v___x_1141_; 
v_value_1140_ = lean_ctor_get(v___x_1139_, 0);
lean_inc(v_value_1140_);
lean_dec_ref_known(v___x_1139_, 1);
v___x_1141_ = lp_algalVerification_Algal_Source_evalExpr(v_right_1138_, v_x_1013_);
if (lean_obj_tag(v___x_1141_) == 0)
{
lean_object* v_value_1142_; lean_object* v___x_1144_; uint8_t v_isShared_1145_; uint8_t v_isSharedCheck_1152_; 
v_value_1142_ = lean_ctor_get(v___x_1141_, 0);
v_isSharedCheck_1152_ = !lean_is_exclusive(v___x_1141_);
if (v_isSharedCheck_1152_ == 0)
{
v___x_1144_ = v___x_1141_;
v_isShared_1145_ = v_isSharedCheck_1152_;
goto v_resetjp_1143_;
}
else
{
lean_inc(v_value_1142_);
lean_dec(v___x_1141_);
v___x_1144_ = lean_box(0);
v_isShared_1145_ = v_isSharedCheck_1152_;
goto v_resetjp_1143_;
}
v_resetjp_1143_:
{
lean_object* v___x_1146_; 
v___x_1146_ = lp_algalVerification_Algal_Source_evalBin(v_op_1100_, v_value_1140_, v_value_1142_);
if (lean_obj_tag(v___x_1146_) == 0)
{
lean_object* v___x_1147_; 
lean_dec_ref_known(v___x_1146_, 1);
lean_del_object(v___x_1144_);
v___x_1147_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1147_;
}
else
{
lean_object* v_a_1148_; lean_object* v___x_1150_; 
v_a_1148_ = lean_ctor_get(v___x_1146_, 0);
lean_inc(v_a_1148_);
lean_dec_ref_known(v___x_1146_, 1);
if (v_isShared_1145_ == 0)
{
lean_ctor_set(v___x_1144_, 0, v_a_1148_);
v___x_1150_ = v___x_1144_;
goto v_reusejp_1149_;
}
else
{
lean_object* v_reuseFailAlloc_1151_; 
v_reuseFailAlloc_1151_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1151_, 0, v_a_1148_);
v___x_1150_ = v_reuseFailAlloc_1151_;
goto v_reusejp_1149_;
}
v_reusejp_1149_:
{
return v___x_1150_;
}
}
}
}
else
{
lean_dec(v_value_1140_);
return v___x_1141_;
}
}
else
{
lean_dec_ref(v_right_1138_);
return v___x_1139_;
}
}
}
}
case 6:
{
lean_object* v_entries_1153_; lean_object* v___x_1155_; uint8_t v_isShared_1156_; uint8_t v_isSharedCheck_1179_; 
v_entries_1153_ = lean_ctor_get(v_x_1012_, 0);
v_isSharedCheck_1179_ = !lean_is_exclusive(v_x_1012_);
if (v_isSharedCheck_1179_ == 0)
{
v___x_1155_ = v_x_1012_;
v_isShared_1156_ = v_isSharedCheck_1179_;
goto v_resetjp_1154_;
}
else
{
lean_inc(v_entries_1153_);
lean_dec(v_x_1012_);
v___x_1155_ = lean_box(0);
v_isShared_1156_ = v_isSharedCheck_1179_;
goto v_resetjp_1154_;
}
v_resetjp_1154_:
{
lean_object* v___x_1157_; 
v___x_1157_ = lp_algalVerification_Algal_Source_evalRecordEntries(v_entries_1153_, v_x_1013_);
switch(lean_obj_tag(v___x_1157_))
{
case 0:
{
lean_object* v_value_1158_; lean_object* v___x_1160_; uint8_t v_isShared_1161_; uint8_t v_isSharedCheck_1169_; 
v_value_1158_ = lean_ctor_get(v___x_1157_, 0);
v_isSharedCheck_1169_ = !lean_is_exclusive(v___x_1157_);
if (v_isSharedCheck_1169_ == 0)
{
v___x_1160_ = v___x_1157_;
v_isShared_1161_ = v_isSharedCheck_1169_;
goto v_resetjp_1159_;
}
else
{
lean_inc(v_value_1158_);
lean_dec(v___x_1157_);
v___x_1160_ = lean_box(0);
v_isShared_1161_ = v_isSharedCheck_1169_;
goto v_resetjp_1159_;
}
v_resetjp_1159_:
{
lean_object* v___x_1162_; lean_object* v___x_1164_; 
v___x_1162_ = lp_algalVerification_Algal_Source_fieldsOf(v_value_1158_);
lean_dec(v_value_1158_);
if (v_isShared_1156_ == 0)
{
lean_ctor_set_tag(v___x_1155_, 5);
lean_ctor_set(v___x_1155_, 0, v___x_1162_);
v___x_1164_ = v___x_1155_;
goto v_reusejp_1163_;
}
else
{
lean_object* v_reuseFailAlloc_1168_; 
v_reuseFailAlloc_1168_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1168_, 0, v___x_1162_);
v___x_1164_ = v_reuseFailAlloc_1168_;
goto v_reusejp_1163_;
}
v_reusejp_1163_:
{
lean_object* v___x_1166_; 
if (v_isShared_1161_ == 0)
{
lean_ctor_set(v___x_1160_, 0, v___x_1164_);
v___x_1166_ = v___x_1160_;
goto v_reusejp_1165_;
}
else
{
lean_object* v_reuseFailAlloc_1167_; 
v_reuseFailAlloc_1167_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1167_, 0, v___x_1164_);
v___x_1166_ = v_reuseFailAlloc_1167_;
goto v_reusejp_1165_;
}
v_reusejp_1165_:
{
return v___x_1166_;
}
}
}
}
case 1:
{
lean_object* v___x_1170_; 
lean_del_object(v___x_1155_);
v___x_1170_ = lean_box(1);
return v___x_1170_;
}
default: 
{
uint8_t v_e_1171_; lean_object* v___x_1173_; uint8_t v_isShared_1174_; uint8_t v_isSharedCheck_1178_; 
lean_del_object(v___x_1155_);
v_e_1171_ = lean_ctor_get_uint8(v___x_1157_, 0);
v_isSharedCheck_1178_ = !lean_is_exclusive(v___x_1157_);
if (v_isSharedCheck_1178_ == 0)
{
v___x_1173_ = v___x_1157_;
v_isShared_1174_ = v_isSharedCheck_1178_;
goto v_resetjp_1172_;
}
else
{
lean_dec(v___x_1157_);
v___x_1173_ = lean_box(0);
v_isShared_1174_ = v_isSharedCheck_1178_;
goto v_resetjp_1172_;
}
v_resetjp_1172_:
{
lean_object* v___x_1176_; 
if (v_isShared_1174_ == 0)
{
v___x_1176_ = v___x_1173_;
goto v_reusejp_1175_;
}
else
{
lean_object* v_reuseFailAlloc_1177_; 
v_reuseFailAlloc_1177_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1177_, 0, v_e_1171_);
v___x_1176_ = v_reuseFailAlloc_1177_;
goto v_reusejp_1175_;
}
v_reusejp_1175_:
{
return v___x_1176_;
}
}
}
}
}
}
case 7:
{
lean_object* v_items_1180_; lean_object* v___x_1182_; uint8_t v_isShared_1183_; uint8_t v_isSharedCheck_1206_; 
v_items_1180_ = lean_ctor_get(v_x_1012_, 0);
v_isSharedCheck_1206_ = !lean_is_exclusive(v_x_1012_);
if (v_isSharedCheck_1206_ == 0)
{
v___x_1182_ = v_x_1012_;
v_isShared_1183_ = v_isSharedCheck_1206_;
goto v_resetjp_1181_;
}
else
{
lean_inc(v_items_1180_);
lean_dec(v_x_1012_);
v___x_1182_ = lean_box(0);
v_isShared_1183_ = v_isSharedCheck_1206_;
goto v_resetjp_1181_;
}
v_resetjp_1181_:
{
lean_object* v___x_1184_; 
v___x_1184_ = lp_algalVerification_Algal_Source_evalItems(v_items_1180_, v_x_1013_);
switch(lean_obj_tag(v___x_1184_))
{
case 0:
{
lean_object* v_value_1185_; lean_object* v___x_1187_; uint8_t v_isShared_1188_; uint8_t v_isSharedCheck_1196_; 
v_value_1185_ = lean_ctor_get(v___x_1184_, 0);
v_isSharedCheck_1196_ = !lean_is_exclusive(v___x_1184_);
if (v_isSharedCheck_1196_ == 0)
{
v___x_1187_ = v___x_1184_;
v_isShared_1188_ = v_isSharedCheck_1196_;
goto v_resetjp_1186_;
}
else
{
lean_inc(v_value_1185_);
lean_dec(v___x_1184_);
v___x_1187_ = lean_box(0);
v_isShared_1188_ = v_isSharedCheck_1196_;
goto v_resetjp_1186_;
}
v_resetjp_1186_:
{
lean_object* v___x_1189_; lean_object* v___x_1191_; 
v___x_1189_ = lp_algalVerification_Algal_Source_itemsOf(v_value_1185_);
if (v_isShared_1183_ == 0)
{
lean_ctor_set_tag(v___x_1182_, 4);
lean_ctor_set(v___x_1182_, 0, v___x_1189_);
v___x_1191_ = v___x_1182_;
goto v_reusejp_1190_;
}
else
{
lean_object* v_reuseFailAlloc_1195_; 
v_reuseFailAlloc_1195_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1195_, 0, v___x_1189_);
v___x_1191_ = v_reuseFailAlloc_1195_;
goto v_reusejp_1190_;
}
v_reusejp_1190_:
{
lean_object* v___x_1193_; 
if (v_isShared_1188_ == 0)
{
lean_ctor_set(v___x_1187_, 0, v___x_1191_);
v___x_1193_ = v___x_1187_;
goto v_reusejp_1192_;
}
else
{
lean_object* v_reuseFailAlloc_1194_; 
v_reuseFailAlloc_1194_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1194_, 0, v___x_1191_);
v___x_1193_ = v_reuseFailAlloc_1194_;
goto v_reusejp_1192_;
}
v_reusejp_1192_:
{
return v___x_1193_;
}
}
}
}
case 1:
{
lean_object* v___x_1197_; 
lean_del_object(v___x_1182_);
v___x_1197_ = lean_box(1);
return v___x_1197_;
}
default: 
{
uint8_t v_e_1198_; lean_object* v___x_1200_; uint8_t v_isShared_1201_; uint8_t v_isSharedCheck_1205_; 
lean_del_object(v___x_1182_);
v_e_1198_ = lean_ctor_get_uint8(v___x_1184_, 0);
v_isSharedCheck_1205_ = !lean_is_exclusive(v___x_1184_);
if (v_isSharedCheck_1205_ == 0)
{
v___x_1200_ = v___x_1184_;
v_isShared_1201_ = v_isSharedCheck_1205_;
goto v_resetjp_1199_;
}
else
{
lean_dec(v___x_1184_);
v___x_1200_ = lean_box(0);
v_isShared_1201_ = v_isSharedCheck_1205_;
goto v_resetjp_1199_;
}
v_resetjp_1199_:
{
lean_object* v___x_1203_; 
if (v_isShared_1201_ == 0)
{
v___x_1203_ = v___x_1200_;
goto v_reusejp_1202_;
}
else
{
lean_object* v_reuseFailAlloc_1204_; 
v_reuseFailAlloc_1204_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1204_, 0, v_e_1198_);
v___x_1203_ = v_reuseFailAlloc_1204_;
goto v_reusejp_1202_;
}
v_reusejp_1202_:
{
return v___x_1203_;
}
}
}
}
}
}
case 8:
{
lean_object* v_condition_1207_; lean_object* v_yes_1208_; lean_object* v_no_1209_; lean_object* v___x_1210_; 
v_condition_1207_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_condition_1207_);
v_yes_1208_ = lean_ctor_get(v_x_1012_, 1);
lean_inc_ref(v_yes_1208_);
v_no_1209_ = lean_ctor_get(v_x_1012_, 2);
lean_inc_ref(v_no_1209_);
lean_dec_ref_known(v_x_1012_, 3);
v___x_1210_ = lp_algalVerification_Algal_Source_evalExpr(v_condition_1207_, v_x_1013_);
if (lean_obj_tag(v___x_1210_) == 0)
{
lean_object* v_value_1211_; lean_object* v___x_1212_; 
v_value_1211_ = lean_ctor_get(v___x_1210_, 0);
lean_inc(v_value_1211_);
lean_dec_ref_known(v___x_1210_, 1);
v___x_1212_ = lp_algalVerification_Algal_Source_truthy(v_value_1211_);
lean_dec(v_value_1211_);
if (lean_obj_tag(v___x_1212_) == 0)
{
lean_object* v___x_1213_; 
lean_dec_ref_known(v___x_1212_, 1);
lean_dec_ref(v_no_1209_);
lean_dec_ref(v_yes_1208_);
v___x_1213_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1213_;
}
else
{
lean_object* v_a_1214_; uint8_t v___x_1215_; 
v_a_1214_ = lean_ctor_get(v___x_1212_, 0);
lean_inc(v_a_1214_);
lean_dec_ref_known(v___x_1212_, 1);
v___x_1215_ = lean_unbox(v_a_1214_);
lean_dec(v_a_1214_);
if (v___x_1215_ == 0)
{
lean_dec_ref(v_yes_1208_);
v_x_1012_ = v_no_1209_;
goto _start;
}
else
{
lean_dec_ref(v_no_1209_);
v_x_1012_ = v_yes_1208_;
goto _start;
}
}
}
else
{
lean_dec_ref(v_no_1209_);
lean_dec_ref(v_yes_1208_);
return v___x_1210_;
}
}
case 9:
{
lean_object* v_value_1218_; lean_object* v_arms_1219_; lean_object* v___x_1220_; 
v_value_1218_ = lean_ctor_get(v_x_1012_, 0);
lean_inc_ref(v_value_1218_);
v_arms_1219_ = lean_ctor_get(v_x_1012_, 1);
lean_inc(v_arms_1219_);
lean_dec_ref_known(v_x_1012_, 2);
v___x_1220_ = lp_algalVerification_Algal_Source_evalExpr(v_value_1218_, v_x_1013_);
if (lean_obj_tag(v___x_1220_) == 0)
{
lean_object* v_value_1221_; 
v_value_1221_ = lean_ctor_get(v___x_1220_, 0);
lean_inc(v_value_1221_);
lean_dec_ref_known(v___x_1220_, 1);
if (lean_obj_tag(v_value_1221_) == 3)
{
lean_object* v_value_1222_; lean_object* v___x_1223_; 
v_value_1222_ = lean_ctor_get(v_value_1221_, 0);
lean_inc_ref(v_value_1222_);
lean_dec_ref_known(v_value_1221_, 1);
v___x_1223_ = lp_algalVerification_Algal_Source_evalArms(v_value_1222_, v_arms_1219_, v_x_1013_);
lean_dec_ref(v_value_1222_);
return v___x_1223_;
}
else
{
lean_object* v___x_1224_; 
lean_dec(v_value_1221_);
lean_dec(v_arms_1219_);
v___x_1224_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
return v___x_1224_;
}
}
else
{
lean_dec(v_arms_1219_);
return v___x_1220_;
}
}
default: 
{
lean_object* v___x_1225_; 
lean_dec_ref(v_x_1012_);
v___x_1225_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
return v___x_1225_;
}
}
v___jp_1014_:
{
lean_object* v___x_1016_; lean_object* v___x_1017_; 
v___x_1016_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v___x_1016_, 0, v___y_1015_);
v___x_1017_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1017_, 0, v___x_1016_);
return v___x_1017_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArms(lean_object* v_x_1226_, lean_object* v_x_1227_, lean_object* v_x_1228_){
_start:
{
if (lean_obj_tag(v_x_1227_) == 0)
{
lean_object* v___x_1229_; 
v___x_1229_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
return v___x_1229_;
}
else
{
lean_object* v_head_1230_; lean_object* v_tail_1231_; lean_object* v_fst_1232_; lean_object* v_snd_1233_; uint8_t v___x_1234_; 
v_head_1230_ = lean_ctor_get(v_x_1227_, 0);
lean_inc(v_head_1230_);
v_tail_1231_ = lean_ctor_get(v_x_1227_, 1);
lean_inc(v_tail_1231_);
lean_dec_ref_known(v_x_1227_, 2);
v_fst_1232_ = lean_ctor_get(v_head_1230_, 0);
lean_inc(v_fst_1232_);
v_snd_1233_ = lean_ctor_get(v_head_1230_, 1);
lean_inc(v_snd_1233_);
lean_dec(v_head_1230_);
v___x_1234_ = lean_string_dec_eq(v_fst_1232_, v_x_1226_);
lean_dec(v_fst_1232_);
if (v___x_1234_ == 0)
{
lean_dec(v_snd_1233_);
v_x_1227_ = v_tail_1231_;
goto _start;
}
else
{
lean_object* v___x_1236_; 
lean_dec(v_tail_1231_);
v___x_1236_ = lp_algalVerification_Algal_Source_evalExpr(v_snd_1233_, v_x_1228_);
return v___x_1236_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArms___boxed(lean_object* v_x_1237_, lean_object* v_x_1238_, lean_object* v_x_1239_){
_start:
{
lean_object* v_res_1240_; 
v_res_1240_ = lp_algalVerification_Algal_Source_evalArms(v_x_1237_, v_x_1238_, v_x_1239_);
lean_dec(v_x_1239_);
lean_dec_ref(v_x_1237_);
return v_res_1240_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalItems___boxed(lean_object* v_x_1241_, lean_object* v_x_1242_){
_start:
{
lean_object* v_res_1243_; 
v_res_1243_ = lp_algalVerification_Algal_Source_evalItems(v_x_1241_, v_x_1242_);
lean_dec(v_x_1242_);
return v_res_1243_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalRecordEntries___boxed(lean_object* v_x_1244_, lean_object* v_x_1245_){
_start:
{
lean_object* v_res_1246_; 
v_res_1246_ = lp_algalVerification_Algal_Source_evalRecordEntries(v_x_1244_, v_x_1245_);
lean_dec(v_x_1245_);
return v_res_1246_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalExpr___boxed(lean_object* v_x_1247_, lean_object* v_x_1248_){
_start:
{
lean_object* v_res_1249_; 
v_res_1249_ = lp_algalVerification_Algal_Source_evalExpr(v_x_1247_, v_x_1248_);
lean_dec(v_x_1248_);
return v_res_1249_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesEntries(lean_object* v_x_1250_){
_start:
{
if (lean_obj_tag(v_x_1250_) == 0)
{
lean_object* v___x_1251_; 
v___x_1251_ = lean_box(0);
return v___x_1251_;
}
else
{
lean_object* v_head_1252_; lean_object* v_tail_1253_; lean_object* v_snd_1254_; lean_object* v___x_1255_; lean_object* v___x_1256_; lean_object* v___x_1257_; 
v_head_1252_ = lean_ctor_get(v_x_1250_, 0);
v_tail_1253_ = lean_ctor_get(v_x_1250_, 1);
v_snd_1254_ = lean_ctor_get(v_head_1252_, 1);
v___x_1255_ = lp_algalVerification_Algal_Source_freeNames(v_snd_1254_);
v___x_1256_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_tail_1253_);
v___x_1257_ = l_List_appendTR___redArg(v___x_1255_, v___x_1256_);
return v___x_1257_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNames(lean_object* v_x_1258_){
_start:
{
lean_object* v_v_1260_; lean_object* v_l_1261_; 
switch(lean_obj_tag(v_x_1258_))
{
case 0:
{
lean_object* v___x_1265_; 
v___x_1265_ = lean_box(0);
return v___x_1265_;
}
case 1:
{
lean_object* v_n_1266_; lean_object* v___x_1267_; lean_object* v___x_1268_; 
v_n_1266_ = lean_ctor_get(v_x_1258_, 0);
v___x_1267_ = lean_box(0);
lean_inc_ref(v_n_1266_);
v___x_1268_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1268_, 0, v_n_1266_);
lean_ctor_set(v___x_1268_, 1, v___x_1267_);
return v___x_1268_;
}
case 3:
{
lean_object* v_value_1269_; lean_object* v_label_1270_; 
v_value_1269_ = lean_ctor_get(v_x_1258_, 0);
v_label_1270_ = lean_ctor_get(v_x_1258_, 1);
v_v_1260_ = v_value_1269_;
v_l_1261_ = v_label_1270_;
goto v___jp_1259_;
}
case 5:
{
lean_object* v_left_1271_; lean_object* v_right_1272_; lean_object* v___x_1273_; lean_object* v___x_1274_; lean_object* v___x_1275_; 
v_left_1271_ = lean_ctor_get(v_x_1258_, 0);
v_right_1272_ = lean_ctor_get(v_x_1258_, 1);
v___x_1273_ = lp_algalVerification_Algal_Source_freeNames(v_left_1271_);
v___x_1274_ = lp_algalVerification_Algal_Source_freeNames(v_right_1272_);
v___x_1275_ = l_List_appendTR___redArg(v___x_1273_, v___x_1274_);
return v___x_1275_;
}
case 6:
{
lean_object* v_entries_1276_; lean_object* v___x_1277_; 
v_entries_1276_ = lean_ctor_get(v_x_1258_, 0);
v___x_1277_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_entries_1276_);
return v___x_1277_;
}
case 7:
{
lean_object* v_items_1278_; lean_object* v___x_1279_; 
v_items_1278_ = lean_ctor_get(v_x_1258_, 0);
v___x_1279_ = lp_algalVerification_Algal_Source_freeNamesItems(v_items_1278_);
return v___x_1279_;
}
case 8:
{
lean_object* v_condition_1280_; lean_object* v_yes_1281_; lean_object* v_no_1282_; lean_object* v___x_1283_; lean_object* v___x_1284_; lean_object* v___x_1285_; lean_object* v___x_1286_; lean_object* v___x_1287_; 
v_condition_1280_ = lean_ctor_get(v_x_1258_, 0);
v_yes_1281_ = lean_ctor_get(v_x_1258_, 1);
v_no_1282_ = lean_ctor_get(v_x_1258_, 2);
v___x_1283_ = lp_algalVerification_Algal_Source_freeNames(v_condition_1280_);
v___x_1284_ = lp_algalVerification_Algal_Source_freeNames(v_yes_1281_);
v___x_1285_ = l_List_appendTR___redArg(v___x_1283_, v___x_1284_);
v___x_1286_ = lp_algalVerification_Algal_Source_freeNames(v_no_1282_);
v___x_1287_ = l_List_appendTR___redArg(v___x_1285_, v___x_1286_);
return v___x_1287_;
}
case 9:
{
lean_object* v_value_1288_; lean_object* v_arms_1289_; lean_object* v___x_1290_; lean_object* v___x_1291_; lean_object* v___x_1292_; 
v_value_1288_ = lean_ctor_get(v_x_1258_, 0);
v_arms_1289_ = lean_ctor_get(v_x_1258_, 1);
v___x_1290_ = lp_algalVerification_Algal_Source_freeNames(v_value_1288_);
v___x_1291_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_arms_1289_);
v___x_1292_ = l_List_appendTR___redArg(v___x_1290_, v___x_1291_);
return v___x_1292_;
}
case 10:
{
lean_object* v_context_1293_; 
v_context_1293_ = lean_ctor_get(v_x_1258_, 1);
v_x_1258_ = v_context_1293_;
goto _start;
}
case 11:
{
lean_object* v_instruction_1295_; lean_object* v_context_1296_; 
v_instruction_1295_ = lean_ctor_get(v_x_1258_, 0);
v_context_1296_ = lean_ctor_get(v_x_1258_, 1);
v_v_1260_ = v_instruction_1295_;
v_l_1261_ = v_context_1296_;
goto v___jp_1259_;
}
case 12:
{
lean_object* v_args_1297_; lean_object* v___x_1298_; 
v_args_1297_ = lean_ctor_get(v_x_1258_, 1);
v___x_1298_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_args_1297_);
return v___x_1298_;
}
case 13:
{
lean_object* v_items_1299_; lean_object* v_args_1300_; lean_object* v___x_1301_; lean_object* v___x_1302_; lean_object* v___x_1303_; 
v_items_1299_ = lean_ctor_get(v_x_1258_, 2);
v_args_1300_ = lean_ctor_get(v_x_1258_, 3);
v___x_1301_ = lp_algalVerification_Algal_Source_freeNames(v_items_1299_);
v___x_1302_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_args_1300_);
v___x_1303_ = l_List_appendTR___redArg(v___x_1301_, v___x_1302_);
return v___x_1303_;
}
default: 
{
lean_object* v_value_1304_; 
v_value_1304_ = lean_ctor_get(v_x_1258_, 0);
v_x_1258_ = v_value_1304_;
goto _start;
}
}
v___jp_1259_:
{
lean_object* v___x_1262_; lean_object* v___x_1263_; lean_object* v___x_1264_; 
v___x_1262_ = lp_algalVerification_Algal_Source_freeNames(v_v_1260_);
v___x_1263_ = lp_algalVerification_Algal_Source_freeNames(v_l_1261_);
v___x_1264_ = l_List_appendTR___redArg(v___x_1262_, v___x_1263_);
return v___x_1264_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesItems(lean_object* v_x_1306_){
_start:
{
if (lean_obj_tag(v_x_1306_) == 0)
{
lean_object* v___x_1307_; 
v___x_1307_ = lean_box(0);
return v___x_1307_;
}
else
{
lean_object* v_head_1308_; lean_object* v_tail_1309_; lean_object* v___x_1310_; lean_object* v___x_1311_; lean_object* v___x_1312_; 
v_head_1308_ = lean_ctor_get(v_x_1306_, 0);
v_tail_1309_ = lean_ctor_get(v_x_1306_, 1);
v___x_1310_ = lp_algalVerification_Algal_Source_freeNames(v_head_1308_);
v___x_1311_ = lp_algalVerification_Algal_Source_freeNamesItems(v_tail_1309_);
v___x_1312_ = l_List_appendTR___redArg(v___x_1310_, v___x_1311_);
return v___x_1312_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesItems___boxed(lean_object* v_x_1313_){
_start:
{
lean_object* v_res_1314_; 
v_res_1314_ = lp_algalVerification_Algal_Source_freeNamesItems(v_x_1313_);
lean_dec(v_x_1313_);
return v_res_1314_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNamesEntries___boxed(lean_object* v_x_1315_){
_start:
{
lean_object* v_res_1316_; 
v_res_1316_ = lp_algalVerification_Algal_Source_freeNamesEntries(v_x_1315_);
lean_dec(v_x_1315_);
return v_res_1316_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_freeNames___boxed(lean_object* v_x_1317_){
_start:
{
lean_object* v_res_1318_; 
v_res_1318_ = lp_algalVerification_Algal_Source_freeNames(v_x_1317_);
lean_dec_ref(v_x_1317_);
return v_res_1318_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0(lean_object* v_env_1319_, lean_object* v_x_1320_){
_start:
{
if (lean_obj_tag(v_x_1320_) == 0)
{
uint8_t v___x_1321_; 
v___x_1321_ = 0;
return v___x_1321_;
}
else
{
lean_object* v_head_1322_; lean_object* v_tail_1323_; lean_object* v___x_1324_; 
v_head_1322_ = lean_ctor_get(v_x_1320_, 0);
v_tail_1323_ = lean_ctor_get(v_x_1320_, 1);
v___x_1324_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_head_1322_, v_env_1319_);
if (lean_obj_tag(v___x_1324_) == 1)
{
lean_object* v_val_1325_; 
v_val_1325_ = lean_ctor_get(v___x_1324_, 0);
lean_inc(v_val_1325_);
lean_dec_ref_known(v___x_1324_, 1);
if (lean_obj_tag(v_val_1325_) == 1)
{
lean_dec_ref_known(v_val_1325_, 1);
v_x_1320_ = v_tail_1323_;
goto _start;
}
else
{
uint8_t v___x_1327_; 
lean_dec(v_val_1325_);
v___x_1327_ = 1;
return v___x_1327_;
}
}
else
{
uint8_t v___x_1328_; 
lean_dec(v___x_1324_);
v___x_1328_ = 1;
return v___x_1328_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0___boxed(lean_object* v_env_1329_, lean_object* v_x_1330_){
_start:
{
uint8_t v_res_1331_; lean_object* v_r_1332_; 
v_res_1331_ = lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0(v_env_1329_, v_x_1330_);
lean_dec(v_x_1330_);
lean_dec(v_env_1329_);
v_r_1332_ = lean_box(v_res_1331_);
return v_r_1332_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_undelivered(lean_object* v_e_1333_, lean_object* v_env_1334_){
_start:
{
lean_object* v___x_1335_; uint8_t v___x_1336_; 
v___x_1335_ = lp_algalVerification_Algal_Source_freeNames(v_e_1333_);
v___x_1336_ = lp_algalVerification_List_any___at___00Algal_Source_undelivered_spec__0(v_env_1334_, v___x_1335_);
lean_dec(v___x_1335_);
return v___x_1336_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_undelivered___boxed(lean_object* v_e_1337_, lean_object* v_env_1338_){
_start:
{
uint8_t v_res_1339_; lean_object* v_r_1340_; 
v_res_1339_ = lp_algalVerification_Algal_Source_undelivered(v_e_1337_, v_env_1338_);
lean_dec(v_env_1338_);
lean_dec_ref(v_e_1337_);
v_r_1340_ = lean_box(v_res_1339_);
return v_r_1340_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_step(lean_object* v_budgets_1345_, lean_object* v_s_1346_){
_start:
{
lean_object* v_maxSteps_1347_; lean_object* v_steps_1348_; lean_object* v_calls_1349_; lean_object* v_obs_1350_; lean_object* v_invocations_1351_; lean_object* v___x_1352_; lean_object* v___x_1353_; uint8_t v___x_1354_; 
v_maxSteps_1347_ = lean_ctor_get(v_budgets_1345_, 0);
v_steps_1348_ = lean_ctor_get(v_s_1346_, 0);
v_calls_1349_ = lean_ctor_get(v_s_1346_, 1);
v_obs_1350_ = lean_ctor_get(v_s_1346_, 2);
v_invocations_1351_ = lean_ctor_get(v_s_1346_, 3);
v___x_1352_ = lean_unsigned_to_nat(1u);
v___x_1353_ = lean_nat_add(v_steps_1348_, v___x_1352_);
v___x_1354_ = lean_nat_dec_lt(v_maxSteps_1347_, v___x_1353_);
if (v___x_1354_ == 0)
{
lean_object* v___x_1356_; uint8_t v_isShared_1357_; uint8_t v_isSharedCheck_1363_; 
lean_inc(v_invocations_1351_);
lean_inc(v_obs_1350_);
lean_inc(v_calls_1349_);
v_isSharedCheck_1363_ = !lean_is_exclusive(v_s_1346_);
if (v_isSharedCheck_1363_ == 0)
{
lean_object* v_unused_1364_; lean_object* v_unused_1365_; lean_object* v_unused_1366_; lean_object* v_unused_1367_; 
v_unused_1364_ = lean_ctor_get(v_s_1346_, 3);
lean_dec(v_unused_1364_);
v_unused_1365_ = lean_ctor_get(v_s_1346_, 2);
lean_dec(v_unused_1365_);
v_unused_1366_ = lean_ctor_get(v_s_1346_, 1);
lean_dec(v_unused_1366_);
v_unused_1367_ = lean_ctor_get(v_s_1346_, 0);
lean_dec(v_unused_1367_);
v___x_1356_ = v_s_1346_;
v_isShared_1357_ = v_isSharedCheck_1363_;
goto v_resetjp_1355_;
}
else
{
lean_dec(v_s_1346_);
v___x_1356_ = lean_box(0);
v_isShared_1357_ = v_isSharedCheck_1363_;
goto v_resetjp_1355_;
}
v_resetjp_1355_:
{
lean_object* v___x_1358_; lean_object* v___x_1360_; 
v___x_1358_ = ((lean_object*)(lp_algalVerification_Algal_Source_step___closed__0));
if (v_isShared_1357_ == 0)
{
lean_ctor_set(v___x_1356_, 0, v___x_1353_);
v___x_1360_ = v___x_1356_;
goto v_reusejp_1359_;
}
else
{
lean_object* v_reuseFailAlloc_1362_; 
v_reuseFailAlloc_1362_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_1362_, 0, v___x_1353_);
lean_ctor_set(v_reuseFailAlloc_1362_, 1, v_calls_1349_);
lean_ctor_set(v_reuseFailAlloc_1362_, 2, v_obs_1350_);
lean_ctor_set(v_reuseFailAlloc_1362_, 3, v_invocations_1351_);
v___x_1360_ = v_reuseFailAlloc_1362_;
goto v_reusejp_1359_;
}
v_reusejp_1359_:
{
lean_object* v___x_1361_; 
v___x_1361_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1361_, 0, v___x_1358_);
lean_ctor_set(v___x_1361_, 1, v___x_1360_);
return v___x_1361_;
}
}
}
else
{
lean_object* v___x_1368_; lean_object* v___x_1369_; 
lean_dec(v___x_1353_);
v___x_1368_ = ((lean_object*)(lp_algalVerification_Algal_Source_step___closed__1));
v___x_1369_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1369_, 0, v___x_1368_);
lean_ctor_set(v___x_1369_, 1, v_s_1346_);
return v___x_1369_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_step___boxed(lean_object* v_budgets_1370_, lean_object* v_s_1371_){
_start:
{
lean_object* v_res_1372_; 
v_res_1372_ = lp_algalVerification_Algal_Source_step(v_budgets_1370_, v_s_1371_);
lean_dec_ref(v_budgets_1370_);
return v_res_1372_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_charge(lean_object* v_budgets_1373_, lean_object* v_s_1374_){
_start:
{
lean_object* v_maxAgentCalls_1375_; lean_object* v_steps_1376_; lean_object* v_calls_1377_; lean_object* v_obs_1378_; lean_object* v_invocations_1379_; lean_object* v___x_1380_; lean_object* v___x_1381_; uint8_t v___x_1382_; 
v_maxAgentCalls_1375_ = lean_ctor_get(v_budgets_1373_, 1);
v_steps_1376_ = lean_ctor_get(v_s_1374_, 0);
v_calls_1377_ = lean_ctor_get(v_s_1374_, 1);
v_obs_1378_ = lean_ctor_get(v_s_1374_, 2);
v_invocations_1379_ = lean_ctor_get(v_s_1374_, 3);
v___x_1380_ = lean_unsigned_to_nat(1u);
v___x_1381_ = lean_nat_add(v_calls_1377_, v___x_1380_);
v___x_1382_ = lean_nat_dec_lt(v_maxAgentCalls_1375_, v___x_1381_);
if (v___x_1382_ == 0)
{
lean_object* v___x_1384_; uint8_t v_isShared_1385_; uint8_t v_isSharedCheck_1391_; 
lean_inc(v_invocations_1379_);
lean_inc(v_obs_1378_);
lean_inc(v_steps_1376_);
v_isSharedCheck_1391_ = !lean_is_exclusive(v_s_1374_);
if (v_isSharedCheck_1391_ == 0)
{
lean_object* v_unused_1392_; lean_object* v_unused_1393_; lean_object* v_unused_1394_; lean_object* v_unused_1395_; 
v_unused_1392_ = lean_ctor_get(v_s_1374_, 3);
lean_dec(v_unused_1392_);
v_unused_1393_ = lean_ctor_get(v_s_1374_, 2);
lean_dec(v_unused_1393_);
v_unused_1394_ = lean_ctor_get(v_s_1374_, 1);
lean_dec(v_unused_1394_);
v_unused_1395_ = lean_ctor_get(v_s_1374_, 0);
lean_dec(v_unused_1395_);
v___x_1384_ = v_s_1374_;
v_isShared_1385_ = v_isSharedCheck_1391_;
goto v_resetjp_1383_;
}
else
{
lean_dec(v_s_1374_);
v___x_1384_ = lean_box(0);
v_isShared_1385_ = v_isSharedCheck_1391_;
goto v_resetjp_1383_;
}
v_resetjp_1383_:
{
lean_object* v___x_1386_; lean_object* v___x_1388_; 
v___x_1386_ = ((lean_object*)(lp_algalVerification_Algal_Source_step___closed__0));
if (v_isShared_1385_ == 0)
{
lean_ctor_set(v___x_1384_, 1, v___x_1381_);
v___x_1388_ = v___x_1384_;
goto v_reusejp_1387_;
}
else
{
lean_object* v_reuseFailAlloc_1390_; 
v_reuseFailAlloc_1390_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_1390_, 0, v_steps_1376_);
lean_ctor_set(v_reuseFailAlloc_1390_, 1, v___x_1381_);
lean_ctor_set(v_reuseFailAlloc_1390_, 2, v_obs_1378_);
lean_ctor_set(v_reuseFailAlloc_1390_, 3, v_invocations_1379_);
v___x_1388_ = v_reuseFailAlloc_1390_;
goto v_reusejp_1387_;
}
v_reusejp_1387_:
{
lean_object* v___x_1389_; 
v___x_1389_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1389_, 0, v___x_1386_);
lean_ctor_set(v___x_1389_, 1, v___x_1388_);
return v___x_1389_;
}
}
}
else
{
lean_object* v___x_1396_; lean_object* v___x_1397_; 
lean_dec(v___x_1381_);
v___x_1396_ = ((lean_object*)(lp_algalVerification_Algal_Source_step___closed__1));
v___x_1397_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1397_, 0, v___x_1396_);
lean_ctor_set(v___x_1397_, 1, v_s_1374_);
return v___x_1397_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_charge___boxed(lean_object* v_budgets_1398_, lean_object* v_s_1399_){
_start:
{
lean_object* v_res_1400_; 
v_res_1400_ = lp_algalVerification_Algal_Source_charge(v_budgets_1398_, v_s_1399_);
lean_dec_ref(v_budgets_1398_);
return v_res_1400_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCell(lean_object* v_budgets_1403_, lean_object* v_e_1404_, lean_object* v_env_1405_, lean_object* v_s_1406_){
_start:
{
uint8_t v___x_1407_; 
v___x_1407_ = lp_algalVerification_Algal_Source_undelivered(v_e_1404_, v_env_1405_);
if (v___x_1407_ == 0)
{
lean_object* v___x_1408_; lean_object* v_fst_1409_; 
v___x_1408_ = lp_algalVerification_Algal_Source_step(v_budgets_1403_, v_s_1406_);
v_fst_1409_ = lean_ctor_get(v___x_1408_, 0);
lean_inc(v_fst_1409_);
if (lean_obj_tag(v_fst_1409_) == 0)
{
lean_object* v_snd_1410_; lean_object* v___x_1412_; uint8_t v_isShared_1413_; uint8_t v_isSharedCheck_1418_; 
lean_dec_ref_known(v_fst_1409_, 1);
v_snd_1410_ = lean_ctor_get(v___x_1408_, 1);
v_isSharedCheck_1418_ = !lean_is_exclusive(v___x_1408_);
if (v_isSharedCheck_1418_ == 0)
{
lean_object* v_unused_1419_; 
v_unused_1419_ = lean_ctor_get(v___x_1408_, 0);
lean_dec(v_unused_1419_);
v___x_1412_ = v___x_1408_;
v_isShared_1413_ = v_isSharedCheck_1418_;
goto v_resetjp_1411_;
}
else
{
lean_inc(v_snd_1410_);
lean_dec(v___x_1408_);
v___x_1412_ = lean_box(0);
v_isShared_1413_ = v_isSharedCheck_1418_;
goto v_resetjp_1411_;
}
v_resetjp_1411_:
{
lean_object* v___x_1414_; lean_object* v___x_1416_; 
v___x_1414_ = lp_algalVerification_Algal_Source_evalExpr(v_e_1404_, v_env_1405_);
if (v_isShared_1413_ == 0)
{
lean_ctor_set(v___x_1412_, 0, v___x_1414_);
v___x_1416_ = v___x_1412_;
goto v_reusejp_1415_;
}
else
{
lean_object* v_reuseFailAlloc_1417_; 
v_reuseFailAlloc_1417_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1417_, 0, v___x_1414_);
lean_ctor_set(v_reuseFailAlloc_1417_, 1, v_snd_1410_);
v___x_1416_ = v_reuseFailAlloc_1417_;
goto v_reusejp_1415_;
}
v_reusejp_1415_:
{
return v___x_1416_;
}
}
}
else
{
lean_object* v_snd_1420_; lean_object* v___x_1422_; uint8_t v_isShared_1423_; uint8_t v_isSharedCheck_1428_; 
lean_dec_ref_known(v_fst_1409_, 0);
lean_dec_ref(v_e_1404_);
v_snd_1420_ = lean_ctor_get(v___x_1408_, 1);
v_isSharedCheck_1428_ = !lean_is_exclusive(v___x_1408_);
if (v_isSharedCheck_1428_ == 0)
{
lean_object* v_unused_1429_; 
v_unused_1429_ = lean_ctor_get(v___x_1408_, 0);
lean_dec(v_unused_1429_);
v___x_1422_ = v___x_1408_;
v_isShared_1423_ = v_isSharedCheck_1428_;
goto v_resetjp_1421_;
}
else
{
lean_inc(v_snd_1420_);
lean_dec(v___x_1408_);
v___x_1422_ = lean_box(0);
v_isShared_1423_ = v_isSharedCheck_1428_;
goto v_resetjp_1421_;
}
v_resetjp_1421_:
{
lean_object* v___x_1424_; lean_object* v___x_1426_; 
v___x_1424_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalCell___closed__0));
if (v_isShared_1423_ == 0)
{
lean_ctor_set(v___x_1422_, 0, v___x_1424_);
v___x_1426_ = v___x_1422_;
goto v_reusejp_1425_;
}
else
{
lean_object* v_reuseFailAlloc_1427_; 
v_reuseFailAlloc_1427_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1427_, 0, v___x_1424_);
lean_ctor_set(v_reuseFailAlloc_1427_, 1, v_snd_1420_);
v___x_1426_ = v_reuseFailAlloc_1427_;
goto v_reusejp_1425_;
}
v_reusejp_1425_:
{
return v___x_1426_;
}
}
}
}
else
{
lean_object* v___x_1430_; lean_object* v___x_1431_; 
lean_dec_ref(v_e_1404_);
v___x_1430_ = lean_box(1);
v___x_1431_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1431_, 0, v___x_1430_);
lean_ctor_set(v___x_1431_, 1, v_s_1406_);
return v___x_1431_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCell___boxed(lean_object* v_budgets_1432_, lean_object* v_e_1433_, lean_object* v_env_1434_, lean_object* v_s_1435_){
_start:
{
lean_object* v_res_1436_; 
v_res_1436_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_1432_, v_e_1433_, v_env_1434_, v_s_1435_);
lean_dec(v_env_1434_);
lean_dec_ref(v_budgets_1432_);
return v_res_1436_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalOperand(lean_object* v_budgets_1437_, lean_object* v_e_1438_, lean_object* v_env_1439_, lean_object* v_s_1440_){
_start:
{
if (lean_obj_tag(v_e_1438_) == 1)
{
lean_object* v___x_1441_; lean_object* v___x_1442_; 
v___x_1441_ = lp_algalVerification_Algal_Source_evalExpr(v_e_1438_, v_env_1439_);
v___x_1442_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1442_, 0, v___x_1441_);
lean_ctor_set(v___x_1442_, 1, v_s_1440_);
return v___x_1442_;
}
else
{
lean_object* v___x_1443_; 
v___x_1443_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_1437_, v_e_1438_, v_env_1439_, v_s_1440_);
return v___x_1443_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalOperand___boxed(lean_object* v_budgets_1444_, lean_object* v_e_1445_, lean_object* v_env_1446_, lean_object* v_s_1447_){
_start:
{
lean_object* v_res_1448_; 
v_res_1448_ = lp_algalVerification_Algal_Source_evalOperand(v_budgets_1444_, v_e_1445_, v_env_1446_, v_s_1447_);
lean_dec(v_env_1446_);
lean_dec_ref(v_budgets_1444_);
return v_res_1448_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getOf(lean_object* v_x_1449_, lean_object* v_x_1450_){
_start:
{
if (lean_obj_tag(v_x_1449_) == 0)
{
lean_object* v___x_1451_; 
v___x_1451_ = lean_box(0);
return v___x_1451_;
}
else
{
lean_object* v_key_1452_; lean_object* v_value_1453_; lean_object* v_rest_1454_; uint8_t v___x_1455_; 
v_key_1452_ = lean_ctor_get(v_x_1449_, 0);
v_value_1453_ = lean_ctor_get(v_x_1449_, 1);
v_rest_1454_ = lean_ctor_get(v_x_1449_, 2);
v___x_1455_ = lean_string_dec_eq(v_key_1452_, v_x_1450_);
if (v___x_1455_ == 0)
{
v_x_1449_ = v_rest_1454_;
goto _start;
}
else
{
lean_object* v___x_1457_; 
lean_inc(v_value_1453_);
v___x_1457_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1457_, 0, v_value_1453_);
return v___x_1457_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_getOf___boxed(lean_object* v_x_1458_, lean_object* v_x_1459_){
_start:
{
lean_object* v_res_1460_; 
v_res_1460_ = lp_algalVerification_Algal_Source_getOf(v_x_1458_, v_x_1459_);
lean_dec_ref(v_x_1459_);
lean_dec(v_x_1458_);
return v_res_1460_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_asFloat(lean_object* v_x_1461_){
_start:
{
if (lean_obj_tag(v_x_1461_) == 2)
{
uint64_t v_value_1462_; double v___x_1463_; lean_object* v___x_1464_; lean_object* v___x_1465_; 
v_value_1462_ = lean_ctor_get_uint64(v_x_1461_, 0);
v___x_1463_ = lean_float_of_bits(v_value_1462_);
v___x_1464_ = lean_box_float(v___x_1463_);
v___x_1465_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1465_, 0, v___x_1464_);
return v___x_1465_;
}
else
{
lean_object* v___x_1466_; 
v___x_1466_ = lean_box(0);
return v___x_1466_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_asFloat___boxed(lean_object* v_x_1467_){
_start:
{
lean_object* v_res_1468_; 
v_res_1468_ = lp_algalVerification_Algal_Source_asFloat(v_x_1467_);
lean_dec(v_x_1467_);
return v_res_1468_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2(lean_object* v_a_1469_, lean_object* v_x_1470_){
_start:
{
if (lean_obj_tag(v_x_1470_) == 0)
{
uint8_t v___x_1471_; 
v___x_1471_ = 0;
return v___x_1471_;
}
else
{
lean_object* v_head_1472_; lean_object* v_tail_1473_; uint8_t v___x_1474_; 
v_head_1472_ = lean_ctor_get(v_x_1470_, 0);
v_tail_1473_ = lean_ctor_get(v_x_1470_, 1);
v___x_1474_ = lean_string_dec_eq(v_a_1469_, v_head_1472_);
if (v___x_1474_ == 0)
{
v_x_1470_ = v_tail_1473_;
goto _start;
}
else
{
return v___x_1474_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2___boxed(lean_object* v_a_1476_, lean_object* v_x_1477_){
_start:
{
uint8_t v_res_1478_; lean_object* v_r_1479_; 
v_res_1478_ = lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2(v_a_1476_, v_x_1477_);
lean_dec(v_x_1477_);
lean_dec_ref(v_a_1476_);
v_r_1479_ = lean_box(v_res_1478_);
return v_r_1479_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0(lean_object* v_probs_1480_, lean_object* v_a_1481_, lean_object* v_a_1482_){
_start:
{
if (lean_obj_tag(v_a_1481_) == 0)
{
lean_object* v___x_1483_; 
v___x_1483_ = l_List_reverse___redArg(v_a_1482_);
return v___x_1483_;
}
else
{
lean_object* v_head_1484_; lean_object* v_tail_1485_; lean_object* v___x_1487_; uint8_t v_isShared_1488_; uint8_t v_isSharedCheck_1506_; 
v_head_1484_ = lean_ctor_get(v_a_1481_, 0);
v_tail_1485_ = lean_ctor_get(v_a_1481_, 1);
v_isSharedCheck_1506_ = !lean_is_exclusive(v_a_1481_);
if (v_isSharedCheck_1506_ == 0)
{
v___x_1487_ = v_a_1481_;
v_isShared_1488_ = v_isSharedCheck_1506_;
goto v_resetjp_1486_;
}
else
{
lean_inc(v_tail_1485_);
lean_inc(v_head_1484_);
lean_dec(v_a_1481_);
v___x_1487_ = lean_box(0);
v_isShared_1488_ = v_isSharedCheck_1506_;
goto v_resetjp_1486_;
}
v_resetjp_1486_:
{
lean_object* v___y_1490_; 
if (lean_obj_tag(v_probs_1480_) == 1)
{
lean_object* v_val_1495_; 
v_val_1495_ = lean_ctor_get(v_probs_1480_, 0);
if (lean_obj_tag(v_val_1495_) == 5)
{
lean_object* v_fields_1496_; lean_object* v___x_1497_; 
v_fields_1496_ = lean_ctor_get(v_val_1495_, 0);
v___x_1497_ = lp_algalVerification_Algal_Source_getOf(v_fields_1496_, v_head_1484_);
if (lean_obj_tag(v___x_1497_) == 0)
{
lean_object* v___x_1498_; lean_object* v___x_1499_; 
v___x_1498_ = lean_box(0);
v___x_1499_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1499_, 0, v_head_1484_);
lean_ctor_set(v___x_1499_, 1, v___x_1498_);
v___y_1490_ = v___x_1499_;
goto v___jp_1489_;
}
else
{
lean_object* v_val_1500_; lean_object* v___x_1501_; 
v_val_1500_ = lean_ctor_get(v___x_1497_, 0);
lean_inc(v_val_1500_);
lean_dec_ref_known(v___x_1497_, 1);
v___x_1501_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1501_, 0, v_head_1484_);
lean_ctor_set(v___x_1501_, 1, v_val_1500_);
v___y_1490_ = v___x_1501_;
goto v___jp_1489_;
}
}
else
{
lean_object* v___x_1502_; lean_object* v___x_1503_; 
v___x_1502_ = lean_box(0);
v___x_1503_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1503_, 0, v_head_1484_);
lean_ctor_set(v___x_1503_, 1, v___x_1502_);
v___y_1490_ = v___x_1503_;
goto v___jp_1489_;
}
}
else
{
lean_object* v___x_1504_; lean_object* v___x_1505_; 
v___x_1504_ = lean_box(0);
v___x_1505_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1505_, 0, v_head_1484_);
lean_ctor_set(v___x_1505_, 1, v___x_1504_);
v___y_1490_ = v___x_1505_;
goto v___jp_1489_;
}
v___jp_1489_:
{
lean_object* v___x_1492_; 
if (v_isShared_1488_ == 0)
{
lean_ctor_set(v___x_1487_, 1, v_a_1482_);
lean_ctor_set(v___x_1487_, 0, v___y_1490_);
v___x_1492_ = v___x_1487_;
goto v_reusejp_1491_;
}
else
{
lean_object* v_reuseFailAlloc_1494_; 
v_reuseFailAlloc_1494_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1494_, 0, v___y_1490_);
lean_ctor_set(v_reuseFailAlloc_1494_, 1, v_a_1482_);
v___x_1492_ = v_reuseFailAlloc_1494_;
goto v_reusejp_1491_;
}
v_reusejp_1491_:
{
v_a_1481_ = v_tail_1485_;
v_a_1482_ = v___x_1492_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0___boxed(lean_object* v_probs_1507_, lean_object* v_a_1508_, lean_object* v_a_1509_){
_start:
{
lean_object* v_res_1510_; 
v_res_1510_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0(v_probs_1507_, v_a_1508_, v_a_1509_);
lean_dec(v_probs_1507_);
return v_res_1510_;
}
}
static double _init_lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0(void){
_start:
{
lean_object* v___x_1511_; double v___x_1512_; 
v___x_1511_ = lean_unsigned_to_nat(1u);
v___x_1512_ = lean_float_of_nat(v___x_1511_);
return v___x_1512_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1(lean_object* v_probs_1513_, lean_object* v_x_1514_){
_start:
{
if (lean_obj_tag(v_x_1514_) == 0)
{
uint8_t v___x_1515_; 
v___x_1515_ = 1;
return v___x_1515_;
}
else
{
lean_object* v_head_1516_; lean_object* v_tail_1517_; uint8_t v___y_1519_; 
v_head_1516_ = lean_ctor_get(v_x_1514_, 0);
v_tail_1517_ = lean_ctor_get(v_x_1514_, 1);
if (lean_obj_tag(v_probs_1513_) == 1)
{
lean_object* v_val_1521_; 
v_val_1521_ = lean_ctor_get(v_probs_1513_, 0);
if (lean_obj_tag(v_val_1521_) == 5)
{
lean_object* v_fields_1522_; lean_object* v___x_1523_; 
v_fields_1522_ = lean_ctor_get(v_val_1521_, 0);
v___x_1523_ = lp_algalVerification_Algal_Source_getOf(v_fields_1522_, v_head_1516_);
if (lean_obj_tag(v___x_1523_) == 0)
{
uint8_t v___x_1524_; 
v___x_1524_ = 0;
return v___x_1524_;
}
else
{
lean_object* v_val_1525_; lean_object* v___x_1526_; 
v_val_1525_ = lean_ctor_get(v___x_1523_, 0);
lean_inc(v_val_1525_);
lean_dec_ref_known(v___x_1523_, 1);
v___x_1526_ = lp_algalVerification_Algal_Source_asFloat(v_val_1525_);
lean_dec(v_val_1525_);
if (lean_obj_tag(v___x_1526_) == 0)
{
uint8_t v___x_1527_; 
v___x_1527_ = 0;
return v___x_1527_;
}
else
{
lean_object* v_val_1528_; double v___x_1529_; double v___x_1530_; uint8_t v___x_1531_; 
v_val_1528_ = lean_ctor_get(v___x_1526_, 0);
lean_inc(v_val_1528_);
lean_dec_ref_known(v___x_1526_, 1);
v___x_1529_ = lean_float_once(&lp_algalVerification_Algal_Source_evalBin___closed__0, &lp_algalVerification_Algal_Source_evalBin___closed__0_once, _init_lp_algalVerification_Algal_Source_evalBin___closed__0);
v___x_1530_ = lean_unbox_float(v_val_1528_);
v___x_1531_ = lean_float_decLe(v___x_1529_, v___x_1530_);
if (v___x_1531_ == 0)
{
lean_dec(v_val_1528_);
v___y_1519_ = v___x_1531_;
goto v___jp_1518_;
}
else
{
double v___x_1532_; double v___x_1533_; uint8_t v___x_1534_; 
v___x_1532_ = lean_float_once(&lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0, &lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0_once, _init_lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0);
v___x_1533_ = lean_unbox_float(v_val_1528_);
lean_dec(v_val_1528_);
v___x_1534_ = lean_float_decLe(v___x_1533_, v___x_1532_);
v___y_1519_ = v___x_1534_;
goto v___jp_1518_;
}
}
}
}
else
{
uint8_t v___x_1535_; 
v___x_1535_ = 0;
return v___x_1535_;
}
}
else
{
uint8_t v___x_1536_; 
v___x_1536_ = 0;
return v___x_1536_;
}
v___jp_1518_:
{
if (v___y_1519_ == 0)
{
return v___y_1519_;
}
else
{
v_x_1514_ = v_tail_1517_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___boxed(lean_object* v_probs_1537_, lean_object* v_x_1538_){
_start:
{
uint8_t v_res_1539_; lean_object* v_r_1540_; 
v_res_1539_ = lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1(v_probs_1537_, v_x_1538_);
lean_dec(v_x_1538_);
lean_dec(v_probs_1537_);
v_r_1540_ = lean_box(v_res_1539_);
return v_r_1540_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_normalizeDecision(lean_object* v_raw_1547_, lean_object* v_labels_1548_){
_start:
{
if (lean_obj_tag(v_raw_1547_) == 5)
{
lean_object* v_fields_1555_; lean_object* v___x_1556_; lean_object* v___x_1557_; 
v_fields_1555_ = lean_ctor_get(v_raw_1547_, 0);
v___x_1556_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__0));
v___x_1557_ = lp_algalVerification_Algal_Source_getOf(v_fields_1555_, v___x_1556_);
if (lean_obj_tag(v___x_1557_) == 1)
{
lean_object* v_val_1558_; 
v_val_1558_ = lean_ctor_get(v___x_1557_, 0);
lean_inc(v_val_1558_);
lean_dec_ref_known(v___x_1557_, 1);
if (lean_obj_tag(v_val_1558_) == 5)
{
lean_object* v_fields_1559_; lean_object* v___x_1561_; uint8_t v_isShared_1562_; uint8_t v_isSharedCheck_1637_; 
v_fields_1559_ = lean_ctor_get(v_val_1558_, 0);
v_isSharedCheck_1637_ = !lean_is_exclusive(v_val_1558_);
if (v_isSharedCheck_1637_ == 0)
{
v___x_1561_ = v_val_1558_;
v_isShared_1562_ = v_isSharedCheck_1637_;
goto v_resetjp_1560_;
}
else
{
lean_inc(v_fields_1559_);
lean_dec(v_val_1558_);
v___x_1561_ = lean_box(0);
v_isShared_1562_ = v_isSharedCheck_1637_;
goto v_resetjp_1560_;
}
v_resetjp_1560_:
{
lean_object* v___x_1563_; lean_object* v___x_1564_; 
v___x_1563_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__1));
v___x_1564_ = lp_algalVerification_Algal_Source_getOf(v_fields_1559_, v___x_1563_);
lean_dec(v_fields_1559_);
if (lean_obj_tag(v___x_1564_) == 1)
{
lean_object* v_val_1565_; lean_object* v___x_1567_; uint8_t v_isShared_1568_; uint8_t v_isSharedCheck_1636_; 
v_val_1565_ = lean_ctor_get(v___x_1564_, 0);
v_isSharedCheck_1636_ = !lean_is_exclusive(v___x_1564_);
if (v_isSharedCheck_1636_ == 0)
{
v___x_1567_ = v___x_1564_;
v_isShared_1568_ = v_isSharedCheck_1636_;
goto v_resetjp_1566_;
}
else
{
lean_inc(v_val_1565_);
lean_dec(v___x_1564_);
v___x_1567_ = lean_box(0);
v_isShared_1568_ = v_isSharedCheck_1636_;
goto v_resetjp_1566_;
}
v_resetjp_1566_:
{
if (lean_obj_tag(v_val_1565_) == 5)
{
lean_object* v_fields_1569_; lean_object* v___x_1571_; uint8_t v_isShared_1572_; uint8_t v_isSharedCheck_1635_; 
v_fields_1569_ = lean_ctor_get(v_val_1565_, 0);
v_isSharedCheck_1635_ = !lean_is_exclusive(v_val_1565_);
if (v_isSharedCheck_1635_ == 0)
{
v___x_1571_ = v_val_1565_;
v_isShared_1572_ = v_isSharedCheck_1635_;
goto v_resetjp_1570_;
}
else
{
lean_inc(v_fields_1569_);
lean_dec(v_val_1565_);
v___x_1571_ = lean_box(0);
v_isShared_1572_ = v_isSharedCheck_1635_;
goto v_resetjp_1570_;
}
v_resetjp_1570_:
{
lean_object* v___x_1573_; lean_object* v_choice_1574_; 
v___x_1573_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__2));
v_choice_1574_ = lp_algalVerification_Algal_Source_getOf(v_fields_1569_, v___x_1573_);
if (lean_obj_tag(v_choice_1574_) == 1)
{
lean_object* v_val_1575_; 
v_val_1575_ = lean_ctor_get(v_choice_1574_, 0);
lean_inc(v_val_1575_);
if (lean_obj_tag(v_val_1575_) == 3)
{
lean_object* v_value_1576_; lean_object* v___x_1578_; uint8_t v_isShared_1579_; uint8_t v_isSharedCheck_1634_; 
v_value_1576_ = lean_ctor_get(v_val_1575_, 0);
v_isSharedCheck_1634_ = !lean_is_exclusive(v_val_1575_);
if (v_isSharedCheck_1634_ == 0)
{
v___x_1578_ = v_val_1575_;
v_isShared_1579_ = v_isSharedCheck_1634_;
goto v_resetjp_1577_;
}
else
{
lean_inc(v_value_1576_);
lean_dec(v_val_1575_);
v___x_1578_ = lean_box(0);
v_isShared_1579_ = v_isSharedCheck_1634_;
goto v_resetjp_1577_;
}
v_resetjp_1577_:
{
lean_object* v___x_1580_; lean_object* v_probs_1581_; uint8_t v_probOk_1582_; uint8_t v___x_1583_; 
v___x_1580_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__1));
v_probs_1581_ = lp_algalVerification_Algal_Source_getOf(v_fields_1569_, v___x_1580_);
v_probOk_1582_ = lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1(v_probs_1581_, v_labels_1548_);
v___x_1583_ = lp_algalVerification_List_elem___at___00Algal_Source_normalizeDecision_spec__2(v_value_1576_, v_labels_1548_);
lean_dec_ref(v_value_1576_);
if (v___x_1583_ == 0)
{
lean_dec(v_probs_1581_);
lean_del_object(v___x_1578_);
lean_dec_ref_known(v_choice_1574_, 1);
lean_del_object(v___x_1571_);
lean_dec(v_fields_1569_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
else
{
if (v_probOk_1582_ == 0)
{
lean_dec(v_probs_1581_);
lean_del_object(v___x_1578_);
lean_dec_ref_known(v_choice_1574_, 1);
lean_del_object(v___x_1571_);
lean_dec(v_fields_1569_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
else
{
lean_object* v___x_1584_; lean_object* v___y_1586_; uint64_t v___y_1587_; lean_object* v_confidence_1612_; lean_object* v___y_1614_; uint8_t v___y_1620_; 
v___x_1584_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__3));
v_confidence_1612_ = lp_algalVerification_Algal_Source_getOf(v_fields_1569_, v___x_1584_);
lean_dec(v_fields_1569_);
if (lean_obj_tag(v_confidence_1612_) == 0)
{
lean_dec(v_probs_1581_);
lean_del_object(v___x_1578_);
lean_dec_ref_known(v_choice_1574_, 1);
lean_del_object(v___x_1571_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
else
{
lean_object* v_val_1625_; lean_object* v___x_1626_; 
v_val_1625_ = lean_ctor_get(v_confidence_1612_, 0);
lean_inc(v_val_1625_);
v___x_1626_ = lp_algalVerification_Algal_Source_asFloat(v_val_1625_);
lean_dec(v_val_1625_);
if (lean_obj_tag(v___x_1626_) == 0)
{
lean_dec_ref_known(v_confidence_1612_, 1);
lean_dec(v_probs_1581_);
lean_del_object(v___x_1578_);
lean_dec_ref_known(v_choice_1574_, 1);
lean_del_object(v___x_1571_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
else
{
lean_object* v_val_1627_; double v___x_1628_; double v___x_1629_; uint8_t v___x_1630_; 
v_val_1627_ = lean_ctor_get(v___x_1626_, 0);
lean_inc(v_val_1627_);
lean_dec_ref_known(v___x_1626_, 1);
v___x_1628_ = lean_float_once(&lp_algalVerification_Algal_Source_evalBin___closed__0, &lp_algalVerification_Algal_Source_evalBin___closed__0_once, _init_lp_algalVerification_Algal_Source_evalBin___closed__0);
v___x_1629_ = lean_unbox_float(v_val_1627_);
v___x_1630_ = lean_float_decLe(v___x_1628_, v___x_1629_);
if (v___x_1630_ == 0)
{
lean_dec(v_val_1627_);
v___y_1620_ = v___x_1630_;
goto v___jp_1619_;
}
else
{
double v___x_1631_; double v___x_1632_; uint8_t v___x_1633_; 
v___x_1631_ = lean_float_once(&lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0, &lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0_once, _init_lp_algalVerification_List_all___at___00Algal_Source_normalizeDecision_spec__1___closed__0);
v___x_1632_ = lean_unbox_float(v_val_1627_);
lean_dec(v_val_1627_);
v___x_1633_ = lean_float_decLe(v___x_1632_, v___x_1631_);
v___y_1620_ = v___x_1633_;
goto v___jp_1619_;
}
}
}
v___jp_1585_:
{
lean_object* v___x_1588_; lean_object* v_probFields_1589_; lean_object* v___x_1590_; lean_object* v___x_1592_; 
v___x_1588_ = lean_box(0);
v_probFields_1589_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_normalizeDecision_spec__0(v_probs_1581_, v_labels_1548_, v___x_1588_);
lean_dec(v_probs_1581_);
v___x_1590_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__4));
if (v_isShared_1579_ == 0)
{
lean_ctor_set(v___x_1578_, 0, v___y_1586_);
v___x_1592_ = v___x_1578_;
goto v_reusejp_1591_;
}
else
{
lean_object* v_reuseFailAlloc_1611_; 
v_reuseFailAlloc_1611_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1611_, 0, v___y_1586_);
v___x_1592_ = v_reuseFailAlloc_1611_;
goto v_reusejp_1591_;
}
v_reusejp_1591_:
{
lean_object* v___x_1593_; lean_object* v___x_1594_; lean_object* v___x_1595_; lean_object* v___x_1596_; lean_object* v___x_1598_; 
v___x_1593_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1593_, 0, v___x_1590_);
lean_ctor_set(v___x_1593_, 1, v___x_1592_);
v___x_1594_ = lean_alloc_ctor(2, 0, 8);
lean_ctor_set_uint64(v___x_1594_, 0, v___y_1587_);
v___x_1595_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1595_, 0, v___x_1584_);
lean_ctor_set(v___x_1595_, 1, v___x_1594_);
v___x_1596_ = lp_algalVerification_Algal_Source_fieldsOf(v_probFields_1589_);
lean_dec(v_probFields_1589_);
if (v_isShared_1572_ == 0)
{
lean_ctor_set(v___x_1571_, 0, v___x_1596_);
v___x_1598_ = v___x_1571_;
goto v_reusejp_1597_;
}
else
{
lean_object* v_reuseFailAlloc_1610_; 
v_reuseFailAlloc_1610_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1610_, 0, v___x_1596_);
v___x_1598_ = v_reuseFailAlloc_1610_;
goto v_reusejp_1597_;
}
v_reusejp_1597_:
{
lean_object* v___x_1599_; lean_object* v___x_1600_; lean_object* v___x_1601_; lean_object* v___x_1602_; lean_object* v___x_1603_; lean_object* v___x_1605_; 
v___x_1599_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1599_, 0, v___x_1580_);
lean_ctor_set(v___x_1599_, 1, v___x_1598_);
v___x_1600_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1600_, 0, v___x_1599_);
lean_ctor_set(v___x_1600_, 1, v___x_1588_);
v___x_1601_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1601_, 0, v___x_1595_);
lean_ctor_set(v___x_1601_, 1, v___x_1600_);
v___x_1602_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1602_, 0, v___x_1593_);
lean_ctor_set(v___x_1602_, 1, v___x_1601_);
v___x_1603_ = lp_algalVerification_Algal_Source_fieldsOf(v___x_1602_);
lean_dec_ref_known(v___x_1602_, 2);
if (v_isShared_1562_ == 0)
{
lean_ctor_set(v___x_1561_, 0, v___x_1603_);
v___x_1605_ = v___x_1561_;
goto v_reusejp_1604_;
}
else
{
lean_object* v_reuseFailAlloc_1609_; 
v_reuseFailAlloc_1609_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1609_, 0, v___x_1603_);
v___x_1605_ = v_reuseFailAlloc_1609_;
goto v_reusejp_1604_;
}
v_reusejp_1604_:
{
lean_object* v___x_1607_; 
if (v_isShared_1568_ == 0)
{
lean_ctor_set(v___x_1567_, 0, v___x_1605_);
v___x_1607_ = v___x_1567_;
goto v_reusejp_1606_;
}
else
{
lean_object* v_reuseFailAlloc_1608_; 
v_reuseFailAlloc_1608_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1608_, 0, v___x_1605_);
v___x_1607_ = v_reuseFailAlloc_1608_;
goto v_reusejp_1606_;
}
v_reusejp_1606_:
{
return v___x_1607_;
}
}
}
}
}
v___jp_1613_:
{
if (lean_obj_tag(v_confidence_1612_) == 1)
{
lean_object* v_val_1615_; 
v_val_1615_ = lean_ctor_get(v_confidence_1612_, 0);
lean_inc(v_val_1615_);
lean_dec_ref_known(v_confidence_1612_, 1);
if (lean_obj_tag(v_val_1615_) == 2)
{
uint64_t v_value_1616_; 
v_value_1616_ = lean_ctor_get_uint64(v_val_1615_, 0);
lean_dec_ref_known(v_val_1615_, 0);
v___y_1586_ = v___y_1614_;
v___y_1587_ = v_value_1616_;
goto v___jp_1585_;
}
else
{
uint64_t v___x_1617_; 
lean_dec(v_val_1615_);
v___x_1617_ = 0ULL;
v___y_1586_ = v___y_1614_;
v___y_1587_ = v___x_1617_;
goto v___jp_1585_;
}
}
else
{
uint64_t v___x_1618_; 
lean_dec(v_confidence_1612_);
v___x_1618_ = 0ULL;
v___y_1586_ = v___y_1614_;
v___y_1587_ = v___x_1618_;
goto v___jp_1585_;
}
}
v___jp_1619_:
{
if (v___y_1620_ == 0)
{
lean_dec(v_confidence_1612_);
lean_dec(v_probs_1581_);
lean_del_object(v___x_1578_);
lean_dec_ref_known(v_choice_1574_, 1);
lean_del_object(v___x_1571_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
else
{
if (lean_obj_tag(v_choice_1574_) == 1)
{
lean_object* v_val_1621_; 
v_val_1621_ = lean_ctor_get(v_choice_1574_, 0);
lean_inc(v_val_1621_);
lean_dec_ref_known(v_choice_1574_, 1);
if (lean_obj_tag(v_val_1621_) == 3)
{
lean_object* v_value_1622_; 
v_value_1622_ = lean_ctor_get(v_val_1621_, 0);
lean_inc_ref(v_value_1622_);
lean_dec_ref_known(v_val_1621_, 1);
v___y_1614_ = v_value_1622_;
goto v___jp_1613_;
}
else
{
lean_object* v___x_1623_; 
lean_dec(v_val_1621_);
v___x_1623_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__5));
v___y_1614_ = v___x_1623_;
goto v___jp_1613_;
}
}
else
{
lean_object* v___x_1624_; 
lean_dec_ref_known(v_choice_1574_, 1);
v___x_1624_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__5));
v___y_1614_ = v___x_1624_;
goto v___jp_1613_;
}
}
}
}
}
}
}
else
{
lean_dec_ref_known(v_choice_1574_, 1);
lean_dec(v_val_1575_);
lean_del_object(v___x_1571_);
lean_dec(v_fields_1569_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
}
else
{
lean_dec(v_choice_1574_);
lean_del_object(v___x_1571_);
lean_dec(v_fields_1569_);
lean_del_object(v___x_1567_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1549_;
}
}
}
else
{
lean_del_object(v___x_1567_);
lean_dec(v_val_1565_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1551_;
}
}
}
else
{
lean_dec(v___x_1564_);
lean_del_object(v___x_1561_);
lean_dec(v_labels_1548_);
goto v___jp_1551_;
}
}
}
else
{
lean_dec(v_val_1558_);
lean_dec(v_labels_1548_);
goto v___jp_1553_;
}
}
else
{
lean_dec(v___x_1557_);
lean_dec(v_labels_1548_);
goto v___jp_1553_;
}
}
else
{
lean_object* v___x_1638_; 
lean_dec(v_labels_1548_);
v___x_1638_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_1638_;
}
v___jp_1549_:
{
lean_object* v___x_1550_; 
v___x_1550_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_1550_;
}
v___jp_1551_:
{
lean_object* v___x_1552_; 
v___x_1552_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_1552_;
}
v___jp_1553_:
{
lean_object* v___x_1554_; 
v___x_1554_ = ((lean_object*)(lp_algalVerification_Algal_Source_getField___closed__0));
return v___x_1554_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_normalizeDecision___boxed(lean_object* v_raw_1639_, lean_object* v_labels_1640_){
_start:
{
lean_object* v_res_1641_; 
v_res_1641_ = lp_algalVerification_Algal_Source_normalizeDecision(v_raw_1639_, v_labels_1640_);
lean_dec(v_raw_1639_);
return v_res_1641_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_listOf(lean_object* v_x_1642_){
_start:
{
if (lean_obj_tag(v_x_1642_) == 0)
{
lean_object* v___x_1643_; 
v___x_1643_ = lean_box(0);
return v___x_1643_;
}
else
{
lean_object* v_value_1644_; lean_object* v_rest_1645_; lean_object* v___x_1647_; uint8_t v_isShared_1648_; uint8_t v_isSharedCheck_1653_; 
v_value_1644_ = lean_ctor_get(v_x_1642_, 0);
v_rest_1645_ = lean_ctor_get(v_x_1642_, 1);
v_isSharedCheck_1653_ = !lean_is_exclusive(v_x_1642_);
if (v_isSharedCheck_1653_ == 0)
{
v___x_1647_ = v_x_1642_;
v_isShared_1648_ = v_isSharedCheck_1653_;
goto v_resetjp_1646_;
}
else
{
lean_inc(v_rest_1645_);
lean_inc(v_value_1644_);
lean_dec(v_x_1642_);
v___x_1647_ = lean_box(0);
v_isShared_1648_ = v_isSharedCheck_1653_;
goto v_resetjp_1646_;
}
v_resetjp_1646_:
{
lean_object* v___x_1649_; lean_object* v___x_1651_; 
v___x_1649_ = lp_algalVerification_Algal_Source_listOf(v_rest_1645_);
if (v_isShared_1648_ == 0)
{
lean_ctor_set(v___x_1647_, 1, v___x_1649_);
v___x_1651_ = v___x_1647_;
goto v_reusejp_1650_;
}
else
{
lean_object* v_reuseFailAlloc_1652_; 
v_reuseFailAlloc_1652_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1652_, 0, v_value_1644_);
lean_ctor_set(v_reuseFailAlloc_1652_, 1, v___x_1649_);
v___x_1651_ = v_reuseFailAlloc_1652_;
goto v_reusejp_1650_;
}
v_reusejp_1650_:
{
return v___x_1651_;
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_portAccepts(uint8_t v_x_1654_, lean_object* v_x_1655_){
_start:
{
switch(v_x_1654_)
{
case 0:
{
if (lean_obj_tag(v_x_1655_) == 3)
{
uint8_t v___x_1656_; 
v___x_1656_ = 1;
return v___x_1656_;
}
else
{
uint8_t v___x_1657_; 
v___x_1657_ = 0;
return v___x_1657_;
}
}
case 1:
{
uint8_t v___x_1658_; 
v___x_1658_ = 1;
return v___x_1658_;
}
default: 
{
if (lean_obj_tag(v_x_1655_) == 1)
{
uint8_t v___x_1659_; 
v___x_1659_ = 1;
return v___x_1659_;
}
else
{
uint8_t v___x_1660_; 
v___x_1660_ = 0;
return v___x_1660_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_portAccepts___boxed(lean_object* v_x_1661_, lean_object* v_x_1662_){
_start:
{
uint8_t v_x_44__boxed_1663_; uint8_t v_res_1664_; lean_object* v_r_1665_; 
v_x_44__boxed_1663_ = lean_unbox(v_x_1661_);
v_res_1664_ = lp_algalVerification_Algal_Source_portAccepts(v_x_44__boxed_1663_, v_x_1662_);
lean_dec(v_x_1662_);
v_r_1665_ = lean_box(v_res_1664_);
return v_r_1665_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seq___redArg(lean_object* v_r_1666_, lean_object* v_k_1667_){
_start:
{
lean_object* v_fst_1668_; 
v_fst_1668_ = lean_ctor_get(v_r_1666_, 0);
lean_inc(v_fst_1668_);
switch(lean_obj_tag(v_fst_1668_))
{
case 0:
{
lean_object* v_snd_1669_; lean_object* v___x_1670_; 
lean_dec_ref_known(v_fst_1668_, 1);
v_snd_1669_ = lean_ctor_get(v_r_1666_, 1);
lean_inc(v_snd_1669_);
lean_dec_ref(v_r_1666_);
v___x_1670_ = lean_apply_1(v_k_1667_, v_snd_1669_);
return v___x_1670_;
}
case 1:
{
lean_object* v_snd_1671_; lean_object* v___x_1673_; uint8_t v_isShared_1674_; uint8_t v_isSharedCheck_1679_; 
lean_dec_ref(v_k_1667_);
v_snd_1671_ = lean_ctor_get(v_r_1666_, 1);
v_isSharedCheck_1679_ = !lean_is_exclusive(v_r_1666_);
if (v_isSharedCheck_1679_ == 0)
{
lean_object* v_unused_1680_; 
v_unused_1680_ = lean_ctor_get(v_r_1666_, 0);
lean_dec(v_unused_1680_);
v___x_1673_ = v_r_1666_;
v_isShared_1674_ = v_isSharedCheck_1679_;
goto v_resetjp_1672_;
}
else
{
lean_inc(v_snd_1671_);
lean_dec(v_r_1666_);
v___x_1673_ = lean_box(0);
v_isShared_1674_ = v_isSharedCheck_1679_;
goto v_resetjp_1672_;
}
v_resetjp_1672_:
{
lean_object* v___x_1675_; lean_object* v___x_1677_; 
v___x_1675_ = lean_box(1);
if (v_isShared_1674_ == 0)
{
lean_ctor_set(v___x_1673_, 0, v___x_1675_);
v___x_1677_ = v___x_1673_;
goto v_reusejp_1676_;
}
else
{
lean_object* v_reuseFailAlloc_1678_; 
v_reuseFailAlloc_1678_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1678_, 0, v___x_1675_);
lean_ctor_set(v_reuseFailAlloc_1678_, 1, v_snd_1671_);
v___x_1677_ = v_reuseFailAlloc_1678_;
goto v_reusejp_1676_;
}
v_reusejp_1676_:
{
return v___x_1677_;
}
}
}
default: 
{
lean_object* v_snd_1681_; lean_object* v___x_1683_; uint8_t v_isShared_1684_; uint8_t v_isSharedCheck_1696_; 
lean_dec_ref(v_k_1667_);
v_snd_1681_ = lean_ctor_get(v_r_1666_, 1);
v_isSharedCheck_1696_ = !lean_is_exclusive(v_r_1666_);
if (v_isSharedCheck_1696_ == 0)
{
lean_object* v_unused_1697_; 
v_unused_1697_ = lean_ctor_get(v_r_1666_, 0);
lean_dec(v_unused_1697_);
v___x_1683_ = v_r_1666_;
v_isShared_1684_ = v_isSharedCheck_1696_;
goto v_resetjp_1682_;
}
else
{
lean_inc(v_snd_1681_);
lean_dec(v_r_1666_);
v___x_1683_ = lean_box(0);
v_isShared_1684_ = v_isSharedCheck_1696_;
goto v_resetjp_1682_;
}
v_resetjp_1682_:
{
uint8_t v_e_1685_; lean_object* v___x_1687_; uint8_t v_isShared_1688_; uint8_t v_isSharedCheck_1695_; 
v_e_1685_ = lean_ctor_get_uint8(v_fst_1668_, 0);
v_isSharedCheck_1695_ = !lean_is_exclusive(v_fst_1668_);
if (v_isSharedCheck_1695_ == 0)
{
v___x_1687_ = v_fst_1668_;
v_isShared_1688_ = v_isSharedCheck_1695_;
goto v_resetjp_1686_;
}
else
{
lean_dec(v_fst_1668_);
v___x_1687_ = lean_box(0);
v_isShared_1688_ = v_isSharedCheck_1695_;
goto v_resetjp_1686_;
}
v_resetjp_1686_:
{
lean_object* v___x_1690_; 
if (v_isShared_1688_ == 0)
{
v___x_1690_ = v___x_1687_;
goto v_reusejp_1689_;
}
else
{
lean_object* v_reuseFailAlloc_1694_; 
v_reuseFailAlloc_1694_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1694_, 0, v_e_1685_);
v___x_1690_ = v_reuseFailAlloc_1694_;
goto v_reusejp_1689_;
}
v_reusejp_1689_:
{
lean_object* v___x_1692_; 
if (v_isShared_1684_ == 0)
{
lean_ctor_set(v___x_1683_, 0, v___x_1690_);
v___x_1692_ = v___x_1683_;
goto v_reusejp_1691_;
}
else
{
lean_object* v_reuseFailAlloc_1693_; 
v_reuseFailAlloc_1693_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1693_, 0, v___x_1690_);
lean_ctor_set(v_reuseFailAlloc_1693_, 1, v_snd_1681_);
v___x_1692_ = v_reuseFailAlloc_1693_;
goto v_reusejp_1691_;
}
v_reusejp_1691_:
{
return v___x_1692_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seq(lean_object* v_00_u03b1_1698_, lean_object* v_r_1699_, lean_object* v_k_1700_){
_start:
{
lean_object* v___x_1701_; 
v___x_1701_ = lp_algalVerification_Algal_Source_seq___redArg(v_r_1699_, v_k_1700_);
return v___x_1701_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seqR___redArg(lean_object* v_r_1702_, lean_object* v_k_1703_){
_start:
{
lean_object* v_fst_1704_; 
v_fst_1704_ = lean_ctor_get(v_r_1702_, 0);
lean_inc(v_fst_1704_);
switch(lean_obj_tag(v_fst_1704_))
{
case 0:
{
lean_object* v_snd_1705_; lean_object* v_value_1706_; lean_object* v___x_1707_; 
v_snd_1705_ = lean_ctor_get(v_r_1702_, 1);
lean_inc(v_snd_1705_);
lean_dec_ref(v_r_1702_);
v_value_1706_ = lean_ctor_get(v_fst_1704_, 0);
lean_inc(v_value_1706_);
lean_dec_ref_known(v_fst_1704_, 1);
v___x_1707_ = lean_apply_2(v_k_1703_, v_value_1706_, v_snd_1705_);
return v___x_1707_;
}
case 1:
{
lean_object* v_snd_1708_; lean_object* v___x_1710_; uint8_t v_isShared_1711_; uint8_t v_isSharedCheck_1716_; 
lean_dec_ref(v_k_1703_);
v_snd_1708_ = lean_ctor_get(v_r_1702_, 1);
v_isSharedCheck_1716_ = !lean_is_exclusive(v_r_1702_);
if (v_isSharedCheck_1716_ == 0)
{
lean_object* v_unused_1717_; 
v_unused_1717_ = lean_ctor_get(v_r_1702_, 0);
lean_dec(v_unused_1717_);
v___x_1710_ = v_r_1702_;
v_isShared_1711_ = v_isSharedCheck_1716_;
goto v_resetjp_1709_;
}
else
{
lean_inc(v_snd_1708_);
lean_dec(v_r_1702_);
v___x_1710_ = lean_box(0);
v_isShared_1711_ = v_isSharedCheck_1716_;
goto v_resetjp_1709_;
}
v_resetjp_1709_:
{
lean_object* v___x_1712_; lean_object* v___x_1714_; 
v___x_1712_ = lean_box(1);
if (v_isShared_1711_ == 0)
{
lean_ctor_set(v___x_1710_, 0, v___x_1712_);
v___x_1714_ = v___x_1710_;
goto v_reusejp_1713_;
}
else
{
lean_object* v_reuseFailAlloc_1715_; 
v_reuseFailAlloc_1715_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1715_, 0, v___x_1712_);
lean_ctor_set(v_reuseFailAlloc_1715_, 1, v_snd_1708_);
v___x_1714_ = v_reuseFailAlloc_1715_;
goto v_reusejp_1713_;
}
v_reusejp_1713_:
{
return v___x_1714_;
}
}
}
default: 
{
lean_object* v_snd_1718_; lean_object* v___x_1720_; uint8_t v_isShared_1721_; uint8_t v_isSharedCheck_1733_; 
lean_dec_ref(v_k_1703_);
v_snd_1718_ = lean_ctor_get(v_r_1702_, 1);
v_isSharedCheck_1733_ = !lean_is_exclusive(v_r_1702_);
if (v_isSharedCheck_1733_ == 0)
{
lean_object* v_unused_1734_; 
v_unused_1734_ = lean_ctor_get(v_r_1702_, 0);
lean_dec(v_unused_1734_);
v___x_1720_ = v_r_1702_;
v_isShared_1721_ = v_isSharedCheck_1733_;
goto v_resetjp_1719_;
}
else
{
lean_inc(v_snd_1718_);
lean_dec(v_r_1702_);
v___x_1720_ = lean_box(0);
v_isShared_1721_ = v_isSharedCheck_1733_;
goto v_resetjp_1719_;
}
v_resetjp_1719_:
{
uint8_t v_e_1722_; lean_object* v___x_1724_; uint8_t v_isShared_1725_; uint8_t v_isSharedCheck_1732_; 
v_e_1722_ = lean_ctor_get_uint8(v_fst_1704_, 0);
v_isSharedCheck_1732_ = !lean_is_exclusive(v_fst_1704_);
if (v_isSharedCheck_1732_ == 0)
{
v___x_1724_ = v_fst_1704_;
v_isShared_1725_ = v_isSharedCheck_1732_;
goto v_resetjp_1723_;
}
else
{
lean_dec(v_fst_1704_);
v___x_1724_ = lean_box(0);
v_isShared_1725_ = v_isSharedCheck_1732_;
goto v_resetjp_1723_;
}
v_resetjp_1723_:
{
lean_object* v___x_1727_; 
if (v_isShared_1725_ == 0)
{
v___x_1727_ = v___x_1724_;
goto v_reusejp_1726_;
}
else
{
lean_object* v_reuseFailAlloc_1731_; 
v_reuseFailAlloc_1731_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1731_, 0, v_e_1722_);
v___x_1727_ = v_reuseFailAlloc_1731_;
goto v_reusejp_1726_;
}
v_reusejp_1726_:
{
lean_object* v___x_1729_; 
if (v_isShared_1721_ == 0)
{
lean_ctor_set(v___x_1720_, 0, v___x_1727_);
v___x_1729_ = v___x_1720_;
goto v_reusejp_1728_;
}
else
{
lean_object* v_reuseFailAlloc_1730_; 
v_reuseFailAlloc_1730_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1730_, 0, v___x_1727_);
lean_ctor_set(v_reuseFailAlloc_1730_, 1, v_snd_1718_);
v___x_1729_ = v_reuseFailAlloc_1730_;
goto v_reusejp_1728_;
}
v_reusejp_1728_:
{
return v___x_1729_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_seqR(lean_object* v_00_u03b1_1735_, lean_object* v_00_u03b2_1736_, lean_object* v_r_1737_, lean_object* v_k_1738_){
_start:
{
lean_object* v___x_1739_; 
v___x_1739_ = lp_algalVerification_Algal_Source_seqR___redArg(v_r_1737_, v_k_1738_);
return v___x_1739_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___lam__0(lean_object* v_fst_1740_, lean_object* v_xs_1741_, lean_object* v_s_1742_){
_start:
{
lean_object* v___x_1743_; lean_object* v___x_1744_; lean_object* v___x_1745_; lean_object* v___x_1746_; lean_object* v___x_1747_; 
v___x_1743_ = lean_box(0);
v___x_1744_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1744_, 0, v_fst_1740_);
lean_ctor_set(v___x_1744_, 1, v___x_1743_);
v___x_1745_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1745_, 0, v___x_1744_);
lean_ctor_set(v___x_1745_, 1, v_xs_1741_);
v___x_1746_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1746_, 0, v___x_1745_);
v___x_1747_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1747_, 0, v___x_1746_);
lean_ctor_set(v___x_1747_, 1, v_s_1742_);
return v___x_1747_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___lam__1(lean_object* v_value_1748_, lean_object* v_fst_1749_, lean_object* v_xs_1750_, lean_object* v_s_1751_){
_start:
{
lean_object* v___x_1752_; lean_object* v___x_1753_; lean_object* v___x_1754_; lean_object* v___x_1755_; lean_object* v___x_1756_; 
v___x_1752_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1752_, 0, v_value_1748_);
v___x_1753_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1753_, 0, v_fst_1749_);
lean_ctor_set(v___x_1753_, 1, v___x_1752_);
v___x_1754_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1754_, 0, v___x_1753_);
lean_ctor_set(v___x_1754_, 1, v_xs_1750_);
v___x_1755_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1755_, 0, v___x_1754_);
v___x_1756_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1756_, 0, v___x_1755_);
lean_ctor_set(v___x_1756_, 1, v_s_1751_);
return v___x_1756_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs(lean_object* v_budgets_1761_, lean_object* v_fuel_1762_, lean_object* v_ordered_1763_, lean_object* v_env_1764_, lean_object* v_s_1765_){
_start:
{
lean_object* v_zero_1766_; uint8_t v_isZero_1767_; 
v_zero_1766_ = lean_unsigned_to_nat(0u);
v_isZero_1767_ = lean_nat_dec_eq(v_fuel_1762_, v_zero_1766_);
if (v_isZero_1767_ == 1)
{
lean_object* v___x_1768_; lean_object* v___x_1769_; 
lean_dec(v_ordered_1763_);
v___x_1768_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArgs___closed__0));
v___x_1769_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1769_, 0, v___x_1768_);
lean_ctor_set(v___x_1769_, 1, v_s_1765_);
return v___x_1769_;
}
else
{
if (lean_obj_tag(v_ordered_1763_) == 0)
{
lean_object* v___x_1770_; lean_object* v___x_1771_; 
v___x_1770_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArgs___closed__1));
v___x_1771_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1771_, 0, v___x_1770_);
lean_ctor_set(v___x_1771_, 1, v_s_1765_);
return v___x_1771_;
}
else
{
lean_object* v_head_1772_; lean_object* v_tail_1773_; lean_object* v_fst_1774_; lean_object* v_snd_1775_; lean_object* v_one_1776_; lean_object* v_n_1777_; 
v_head_1772_ = lean_ctor_get(v_ordered_1763_, 0);
lean_inc(v_head_1772_);
v_tail_1773_ = lean_ctor_get(v_ordered_1763_, 1);
lean_inc(v_tail_1773_);
lean_dec_ref_known(v_ordered_1763_, 2);
v_fst_1774_ = lean_ctor_get(v_head_1772_, 0);
lean_inc(v_fst_1774_);
v_snd_1775_ = lean_ctor_get(v_head_1772_, 1);
lean_inc(v_snd_1775_);
lean_dec(v_head_1772_);
v_one_1776_ = lean_unsigned_to_nat(1u);
v_n_1777_ = lean_nat_sub(v_fuel_1762_, v_one_1776_);
if (lean_obj_tag(v_snd_1775_) == 0)
{
lean_object* v___f_1778_; lean_object* v___x_1779_; lean_object* v___x_1780_; 
v___f_1778_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalArgs___lam__0), 3, 1);
lean_closure_set(v___f_1778_, 0, v_fst_1774_);
v___x_1779_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_1761_, v_n_1777_, v_tail_1773_, v_env_1764_, v_s_1765_);
lean_dec(v_n_1777_);
v___x_1780_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_1779_, v___f_1778_);
return v___x_1780_;
}
else
{
lean_object* v_val_1781_; lean_object* v___x_1782_; lean_object* v_fst_1783_; 
v_val_1781_ = lean_ctor_get(v_snd_1775_, 0);
lean_inc(v_val_1781_);
lean_dec_ref_known(v_snd_1775_, 1);
v___x_1782_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_1761_, v_val_1781_, v_env_1764_, v_s_1765_);
v_fst_1783_ = lean_ctor_get(v___x_1782_, 0);
lean_inc(v_fst_1783_);
switch(lean_obj_tag(v_fst_1783_))
{
case 0:
{
lean_object* v_snd_1784_; lean_object* v_value_1785_; lean_object* v___f_1786_; lean_object* v___x_1787_; lean_object* v___x_1788_; 
v_snd_1784_ = lean_ctor_get(v___x_1782_, 1);
lean_inc(v_snd_1784_);
lean_dec_ref(v___x_1782_);
v_value_1785_ = lean_ctor_get(v_fst_1783_, 0);
lean_inc(v_value_1785_);
lean_dec_ref_known(v_fst_1783_, 1);
v___f_1786_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalArgs___lam__1), 4, 2);
lean_closure_set(v___f_1786_, 0, v_value_1785_);
lean_closure_set(v___f_1786_, 1, v_fst_1774_);
v___x_1787_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_1761_, v_n_1777_, v_tail_1773_, v_env_1764_, v_snd_1784_);
lean_dec(v_n_1777_);
v___x_1788_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_1787_, v___f_1786_);
return v___x_1788_;
}
case 1:
{
lean_object* v_snd_1789_; lean_object* v___f_1790_; lean_object* v___x_1791_; lean_object* v___x_1792_; 
v_snd_1789_ = lean_ctor_get(v___x_1782_, 1);
lean_inc(v_snd_1789_);
lean_dec_ref(v___x_1782_);
v___f_1790_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalArgs___lam__0), 3, 1);
lean_closure_set(v___f_1790_, 0, v_fst_1774_);
v___x_1791_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_1761_, v_n_1777_, v_tail_1773_, v_env_1764_, v_snd_1789_);
lean_dec(v_n_1777_);
v___x_1792_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_1791_, v___f_1790_);
return v___x_1792_;
}
default: 
{
lean_object* v_snd_1793_; lean_object* v___x_1795_; uint8_t v_isShared_1796_; uint8_t v_isSharedCheck_1808_; 
lean_dec(v_n_1777_);
lean_dec(v_fst_1774_);
lean_dec(v_tail_1773_);
v_snd_1793_ = lean_ctor_get(v___x_1782_, 1);
v_isSharedCheck_1808_ = !lean_is_exclusive(v___x_1782_);
if (v_isSharedCheck_1808_ == 0)
{
lean_object* v_unused_1809_; 
v_unused_1809_ = lean_ctor_get(v___x_1782_, 0);
lean_dec(v_unused_1809_);
v___x_1795_ = v___x_1782_;
v_isShared_1796_ = v_isSharedCheck_1808_;
goto v_resetjp_1794_;
}
else
{
lean_inc(v_snd_1793_);
lean_dec(v___x_1782_);
v___x_1795_ = lean_box(0);
v_isShared_1796_ = v_isSharedCheck_1808_;
goto v_resetjp_1794_;
}
v_resetjp_1794_:
{
uint8_t v_e_1797_; lean_object* v___x_1799_; uint8_t v_isShared_1800_; uint8_t v_isSharedCheck_1807_; 
v_e_1797_ = lean_ctor_get_uint8(v_fst_1783_, 0);
v_isSharedCheck_1807_ = !lean_is_exclusive(v_fst_1783_);
if (v_isSharedCheck_1807_ == 0)
{
v___x_1799_ = v_fst_1783_;
v_isShared_1800_ = v_isSharedCheck_1807_;
goto v_resetjp_1798_;
}
else
{
lean_dec(v_fst_1783_);
v___x_1799_ = lean_box(0);
v_isShared_1800_ = v_isSharedCheck_1807_;
goto v_resetjp_1798_;
}
v_resetjp_1798_:
{
lean_object* v___x_1802_; 
if (v_isShared_1800_ == 0)
{
v___x_1802_ = v___x_1799_;
goto v_reusejp_1801_;
}
else
{
lean_object* v_reuseFailAlloc_1806_; 
v_reuseFailAlloc_1806_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_1806_, 0, v_e_1797_);
v___x_1802_ = v_reuseFailAlloc_1806_;
goto v_reusejp_1801_;
}
v_reusejp_1801_:
{
lean_object* v___x_1804_; 
if (v_isShared_1796_ == 0)
{
lean_ctor_set(v___x_1795_, 0, v___x_1802_);
v___x_1804_ = v___x_1795_;
goto v_reusejp_1803_;
}
else
{
lean_object* v_reuseFailAlloc_1805_; 
v_reuseFailAlloc_1805_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1805_, 0, v___x_1802_);
lean_ctor_set(v_reuseFailAlloc_1805_, 1, v_snd_1793_);
v___x_1804_ = v_reuseFailAlloc_1805_;
goto v_reusejp_1803_;
}
v_reusejp_1803_:
{
return v___x_1804_;
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
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalArgs___boxed(lean_object* v_budgets_1810_, lean_object* v_fuel_1811_, lean_object* v_ordered_1812_, lean_object* v_env_1813_, lean_object* v_s_1814_){
_start:
{
lean_object* v_res_1815_; 
v_res_1815_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_1810_, v_fuel_1811_, v_ordered_1812_, v_env_1813_, v_s_1814_);
lean_dec(v_env_1813_);
lean_dec(v_fuel_1811_);
lean_dec_ref(v_budgets_1810_);
return v_res_1815_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems___redArg(lean_object* v_child_1819_, lean_object* v_fuel_1820_, lean_object* v_cm_1821_, lean_object* v_over_1822_, lean_object* v_argv_1823_, lean_object* v_xs_1824_, lean_object* v_i_1825_, lean_object* v_site_1826_, lean_object* v_depth_1827_, lean_object* v_s_1828_, lean_object* v_acc_1829_){
_start:
{
lean_object* v_zero_1830_; uint8_t v_isZero_1831_; 
v_zero_1830_ = lean_unsigned_to_nat(0u);
v_isZero_1831_ = lean_nat_dec_eq(v_fuel_1820_, v_zero_1830_);
if (v_isZero_1831_ == 1)
{
lean_object* v___x_1832_; lean_object* v___x_1833_; 
lean_dec(v_acc_1829_);
lean_dec(v_depth_1827_);
lean_dec_ref(v_site_1826_);
lean_dec(v_i_1825_);
lean_dec(v_xs_1824_);
lean_dec(v_argv_1823_);
lean_dec_ref(v_over_1822_);
lean_dec_ref(v_cm_1821_);
lean_dec(v_fuel_1820_);
lean_dec_ref(v_child_1819_);
v___x_1832_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_1833_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1833_, 0, v___x_1832_);
lean_ctor_set(v___x_1833_, 1, v_s_1828_);
return v___x_1833_;
}
else
{
if (lean_obj_tag(v_xs_1824_) == 0)
{
lean_object* v___x_1834_; lean_object* v___x_1835_; lean_object* v___x_1836_; lean_object* v___x_1837_; lean_object* v___x_1838_; 
lean_dec(v_depth_1827_);
lean_dec_ref(v_site_1826_);
lean_dec(v_i_1825_);
lean_dec(v_argv_1823_);
lean_dec_ref(v_over_1822_);
lean_dec_ref(v_cm_1821_);
lean_dec(v_fuel_1820_);
lean_dec_ref(v_child_1819_);
v___x_1834_ = l_List_reverse___redArg(v_acc_1829_);
v___x_1835_ = lp_algalVerification_Algal_Source_itemsOf(v___x_1834_);
v___x_1836_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_1836_, 0, v___x_1835_);
v___x_1837_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1837_, 0, v___x_1836_);
v___x_1838_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1838_, 0, v___x_1837_);
lean_ctor_set(v___x_1838_, 1, v_s_1828_);
return v___x_1838_;
}
else
{
lean_object* v_head_1839_; lean_object* v_tail_1840_; lean_object* v___x_1842_; uint8_t v_isShared_1843_; uint8_t v_isSharedCheck_1888_; 
v_head_1839_ = lean_ctor_get(v_xs_1824_, 0);
v_tail_1840_ = lean_ctor_get(v_xs_1824_, 1);
v_isSharedCheck_1888_ = !lean_is_exclusive(v_xs_1824_);
if (v_isSharedCheck_1888_ == 0)
{
v___x_1842_ = v_xs_1824_;
v_isShared_1843_ = v_isSharedCheck_1888_;
goto v_resetjp_1841_;
}
else
{
lean_inc(v_tail_1840_);
lean_inc(v_head_1839_);
lean_dec(v_xs_1824_);
v___x_1842_ = lean_box(0);
v_isShared_1843_ = v_isSharedCheck_1888_;
goto v_resetjp_1841_;
}
v_resetjp_1841_:
{
lean_object* v_steps_1844_; lean_object* v_calls_1845_; lean_object* v_obs_1846_; lean_object* v_invocations_1847_; lean_object* v___x_1849_; uint8_t v_isShared_1850_; uint8_t v_isSharedCheck_1887_; 
v_steps_1844_ = lean_ctor_get(v_s_1828_, 0);
v_calls_1845_ = lean_ctor_get(v_s_1828_, 1);
v_obs_1846_ = lean_ctor_get(v_s_1828_, 2);
v_invocations_1847_ = lean_ctor_get(v_s_1828_, 3);
v_isSharedCheck_1887_ = !lean_is_exclusive(v_s_1828_);
if (v_isSharedCheck_1887_ == 0)
{
v___x_1849_ = v_s_1828_;
v_isShared_1850_ = v_isSharedCheck_1887_;
goto v_resetjp_1848_;
}
else
{
lean_inc(v_invocations_1847_);
lean_inc(v_obs_1846_);
lean_inc(v_calls_1845_);
lean_inc(v_steps_1844_);
lean_dec(v_s_1828_);
v___x_1849_ = lean_box(0);
v_isShared_1850_ = v_isSharedCheck_1887_;
goto v_resetjp_1848_;
}
v_resetjp_1848_:
{
lean_object* v_key_1851_; lean_object* v___x_1852_; lean_object* v___x_1853_; lean_object* v___x_1854_; lean_object* v___x_1855_; lean_object* v___x_1856_; lean_object* v___x_1857_; lean_object* v___x_1859_; 
v_key_1851_ = lean_ctor_get(v_cm_1821_, 0);
v___x_1852_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__1));
lean_inc_ref(v_site_1826_);
v___x_1853_ = lean_string_append(v_site_1826_, v___x_1852_);
lean_inc(v_i_1825_);
v___x_1854_ = l_Nat_reprFast(v_i_1825_);
v___x_1855_ = lean_string_append(v___x_1853_, v___x_1854_);
lean_dec_ref(v___x_1854_);
lean_inc_ref(v_key_1851_);
lean_inc_ref(v___x_1855_);
v___x_1856_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1856_, 0, v___x_1855_);
lean_ctor_set(v___x_1856_, 1, v_key_1851_);
v___x_1857_ = lean_box(0);
if (v_isShared_1843_ == 0)
{
lean_ctor_set(v___x_1842_, 1, v___x_1857_);
lean_ctor_set(v___x_1842_, 0, v___x_1856_);
v___x_1859_ = v___x_1842_;
goto v_reusejp_1858_;
}
else
{
lean_object* v_reuseFailAlloc_1886_; 
v_reuseFailAlloc_1886_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1886_, 0, v___x_1856_);
lean_ctor_set(v_reuseFailAlloc_1886_, 1, v___x_1857_);
v___x_1859_ = v_reuseFailAlloc_1886_;
goto v_reusejp_1858_;
}
v_reusejp_1858_:
{
lean_object* v___x_1860_; lean_object* v_s_1862_; 
v___x_1860_ = l_List_appendTR___redArg(v_invocations_1847_, v___x_1859_);
if (v_isShared_1850_ == 0)
{
lean_ctor_set(v___x_1849_, 3, v___x_1860_);
v_s_1862_ = v___x_1849_;
goto v_reusejp_1861_;
}
else
{
lean_object* v_reuseFailAlloc_1885_; 
v_reuseFailAlloc_1885_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_1885_, 0, v_steps_1844_);
lean_ctor_set(v_reuseFailAlloc_1885_, 1, v_calls_1845_);
lean_ctor_set(v_reuseFailAlloc_1885_, 2, v_obs_1846_);
lean_ctor_set(v_reuseFailAlloc_1885_, 3, v___x_1860_);
v_s_1862_ = v_reuseFailAlloc_1885_;
goto v_reusejp_1861_;
}
v_reusejp_1861_:
{
lean_object* v___x_1863_; lean_object* v___x_1864_; lean_object* v___x_1865_; lean_object* v___x_1866_; lean_object* v_fst_1867_; lean_object* v_snd_1868_; lean_object* v_one_1869_; lean_object* v_n_1870_; 
v___x_1863_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1863_, 0, v_head_1839_);
lean_inc_ref(v_over_1822_);
v___x_1864_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1864_, 0, v_over_1822_);
lean_ctor_set(v___x_1864_, 1, v___x_1863_);
lean_inc(v_argv_1823_);
v___x_1865_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1865_, 0, v___x_1864_);
lean_ctor_set(v___x_1865_, 1, v_argv_1823_);
lean_inc_ref(v_child_1819_);
lean_inc(v_depth_1827_);
lean_inc_ref(v_cm_1821_);
v___x_1866_ = lean_apply_5(v_child_1819_, v_cm_1821_, v___x_1865_, v___x_1855_, v_depth_1827_, v_s_1862_);
v_fst_1867_ = lean_ctor_get(v___x_1866_, 0);
lean_inc(v_fst_1867_);
v_snd_1868_ = lean_ctor_get(v___x_1866_, 1);
lean_inc(v_snd_1868_);
v_one_1869_ = lean_unsigned_to_nat(1u);
v_n_1870_ = lean_nat_sub(v_fuel_1820_, v_one_1869_);
lean_dec(v_fuel_1820_);
switch(lean_obj_tag(v_fst_1867_))
{
case 0:
{
lean_object* v___x_1872_; uint8_t v_isShared_1873_; uint8_t v_isSharedCheck_1880_; 
v_isSharedCheck_1880_ = !lean_is_exclusive(v___x_1866_);
if (v_isSharedCheck_1880_ == 0)
{
lean_object* v_unused_1881_; lean_object* v_unused_1882_; 
v_unused_1881_ = lean_ctor_get(v___x_1866_, 1);
lean_dec(v_unused_1881_);
v_unused_1882_ = lean_ctor_get(v___x_1866_, 0);
lean_dec(v_unused_1882_);
v___x_1872_ = v___x_1866_;
v_isShared_1873_ = v_isSharedCheck_1880_;
goto v_resetjp_1871_;
}
else
{
lean_dec(v___x_1866_);
v___x_1872_ = lean_box(0);
v_isShared_1873_ = v_isSharedCheck_1880_;
goto v_resetjp_1871_;
}
v_resetjp_1871_:
{
lean_object* v_value_1874_; lean_object* v___x_1875_; lean_object* v___x_1877_; 
v_value_1874_ = lean_ctor_get(v_fst_1867_, 0);
lean_inc(v_value_1874_);
lean_dec_ref_known(v_fst_1867_, 1);
v___x_1875_ = lean_nat_add(v_i_1825_, v_one_1869_);
lean_dec(v_i_1825_);
if (v_isShared_1873_ == 0)
{
lean_ctor_set_tag(v___x_1872_, 1);
lean_ctor_set(v___x_1872_, 1, v_acc_1829_);
lean_ctor_set(v___x_1872_, 0, v_value_1874_);
v___x_1877_ = v___x_1872_;
goto v_reusejp_1876_;
}
else
{
lean_object* v_reuseFailAlloc_1879_; 
v_reuseFailAlloc_1879_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1879_, 0, v_value_1874_);
lean_ctor_set(v_reuseFailAlloc_1879_, 1, v_acc_1829_);
v___x_1877_ = v_reuseFailAlloc_1879_;
goto v_reusejp_1876_;
}
v_reusejp_1876_:
{
v_fuel_1820_ = v_n_1870_;
v_xs_1824_ = v_tail_1840_;
v_i_1825_ = v___x_1875_;
v_s_1828_ = v_snd_1868_;
v_acc_1829_ = v___x_1877_;
goto _start;
}
}
}
case 1:
{
lean_object* v___x_1883_; 
lean_dec_ref(v___x_1866_);
v___x_1883_ = lean_nat_add(v_i_1825_, v_one_1869_);
lean_dec(v_i_1825_);
v_fuel_1820_ = v_n_1870_;
v_xs_1824_ = v_tail_1840_;
v_i_1825_ = v___x_1883_;
v_s_1828_ = v_snd_1868_;
goto _start;
}
default: 
{
lean_dec_ref_known(v_fst_1867_, 0);
lean_dec(v_n_1870_);
lean_dec(v_snd_1868_);
lean_dec(v_tail_1840_);
lean_dec(v_acc_1829_);
lean_dec(v_depth_1827_);
lean_dec_ref(v_site_1826_);
lean_dec(v_i_1825_);
lean_dec(v_argv_1823_);
lean_dec_ref(v_over_1822_);
lean_dec_ref(v_cm_1821_);
lean_dec_ref(v_child_1819_);
return v___x_1866_;
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
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems(lean_object* v_budgets_1889_, lean_object* v_oracle_1890_, lean_object* v_child_1891_, lean_object* v_fuel_1892_, lean_object* v_cm_1893_, lean_object* v_over_1894_, lean_object* v_argv_1895_, lean_object* v_xs_1896_, lean_object* v_i_1897_, lean_object* v_site_1898_, lean_object* v_depth_1899_, lean_object* v_s_1900_, lean_object* v_acc_1901_){
_start:
{
lean_object* v___x_1902_; 
v___x_1902_ = lp_algalVerification_Algal_Source_eachItems___redArg(v_child_1891_, v_fuel_1892_, v_cm_1893_, v_over_1894_, v_argv_1895_, v_xs_1896_, v_i_1897_, v_site_1898_, v_depth_1899_, v_s_1900_, v_acc_1901_);
return v___x_1902_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_eachItems___boxed(lean_object* v_budgets_1903_, lean_object* v_oracle_1904_, lean_object* v_child_1905_, lean_object* v_fuel_1906_, lean_object* v_cm_1907_, lean_object* v_over_1908_, lean_object* v_argv_1909_, lean_object* v_xs_1910_, lean_object* v_i_1911_, lean_object* v_site_1912_, lean_object* v_depth_1913_, lean_object* v_s_1914_, lean_object* v_acc_1915_){
_start:
{
lean_object* v_res_1916_; 
v_res_1916_ = lp_algalVerification_Algal_Source_eachItems(v_budgets_1903_, v_oracle_1904_, v_child_1905_, v_fuel_1906_, v_cm_1907_, v_over_1908_, v_argv_1909_, v_xs_1910_, v_i_1911_, v_site_1912_, v_depth_1913_, v_s_1914_, v_acc_1915_);
lean_dec_ref(v_oracle_1904_);
lean_dec_ref(v_budgets_1903_);
return v_res_1916_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__0(lean_object* v_site_1917_, lean_object* v_key_1918_, lean_object* v_depth_1919_, lean_object* v_child_1920_, lean_object* v_val_1921_, lean_object* v_argv_1922_, lean_object* v_s_1923_){
_start:
{
lean_object* v_steps_1924_; lean_object* v_calls_1925_; lean_object* v_obs_1926_; lean_object* v_invocations_1927_; lean_object* v___x_1929_; uint8_t v_isShared_1930_; uint8_t v_isSharedCheck_1941_; 
v_steps_1924_ = lean_ctor_get(v_s_1923_, 0);
v_calls_1925_ = lean_ctor_get(v_s_1923_, 1);
v_obs_1926_ = lean_ctor_get(v_s_1923_, 2);
v_invocations_1927_ = lean_ctor_get(v_s_1923_, 3);
v_isSharedCheck_1941_ = !lean_is_exclusive(v_s_1923_);
if (v_isSharedCheck_1941_ == 0)
{
v___x_1929_ = v_s_1923_;
v_isShared_1930_ = v_isSharedCheck_1941_;
goto v_resetjp_1928_;
}
else
{
lean_inc(v_invocations_1927_);
lean_inc(v_obs_1926_);
lean_inc(v_calls_1925_);
lean_inc(v_steps_1924_);
lean_dec(v_s_1923_);
v___x_1929_ = lean_box(0);
v_isShared_1930_ = v_isSharedCheck_1941_;
goto v_resetjp_1928_;
}
v_resetjp_1928_:
{
lean_object* v___x_1931_; lean_object* v___x_1932_; lean_object* v___x_1933_; lean_object* v___x_1934_; lean_object* v_s_1936_; 
lean_inc_ref(v_site_1917_);
v___x_1931_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1931_, 0, v_site_1917_);
lean_ctor_set(v___x_1931_, 1, v_key_1918_);
v___x_1932_ = lean_box(0);
v___x_1933_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1933_, 0, v___x_1931_);
lean_ctor_set(v___x_1933_, 1, v___x_1932_);
v___x_1934_ = l_List_appendTR___redArg(v_invocations_1927_, v___x_1933_);
if (v_isShared_1930_ == 0)
{
lean_ctor_set(v___x_1929_, 3, v___x_1934_);
v_s_1936_ = v___x_1929_;
goto v_reusejp_1935_;
}
else
{
lean_object* v_reuseFailAlloc_1940_; 
v_reuseFailAlloc_1940_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_1940_, 0, v_steps_1924_);
lean_ctor_set(v_reuseFailAlloc_1940_, 1, v_calls_1925_);
lean_ctor_set(v_reuseFailAlloc_1940_, 2, v_obs_1926_);
lean_ctor_set(v_reuseFailAlloc_1940_, 3, v___x_1934_);
v_s_1936_ = v_reuseFailAlloc_1940_;
goto v_reusejp_1935_;
}
v_reusejp_1935_:
{
lean_object* v___x_1937_; lean_object* v___x_1938_; lean_object* v___x_1939_; 
v___x_1937_ = lean_unsigned_to_nat(1u);
v___x_1938_ = lean_nat_add(v_depth_1919_, v___x_1937_);
v___x_1939_ = lean_apply_5(v_child_1920_, v_val_1921_, v_argv_1922_, v_site_1917_, v___x_1938_, v_s_1936_);
return v___x_1939_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__0___boxed(lean_object* v_site_1942_, lean_object* v_key_1943_, lean_object* v_depth_1944_, lean_object* v_child_1945_, lean_object* v_val_1946_, lean_object* v_argv_1947_, lean_object* v_s_1948_){
_start:
{
lean_object* v_res_1949_; 
v_res_1949_ = lp_algalVerification_Algal_Source_evalCall___redArg___lam__0(v_site_1942_, v_key_1943_, v_depth_1944_, v_child_1945_, v_val_1946_, v_argv_1947_, v_s_1948_);
lean_dec(v_depth_1944_);
return v_res_1949_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1(lean_object* v_x_1950_){
_start:
{
if (lean_obj_tag(v_x_1950_) == 0)
{
uint8_t v___x_1951_; 
v___x_1951_ = 0;
return v___x_1951_;
}
else
{
lean_object* v_head_1952_; lean_object* v_snd_1953_; 
v_head_1952_ = lean_ctor_get(v_x_1950_, 0);
v_snd_1953_ = lean_ctor_get(v_head_1952_, 1);
if (lean_obj_tag(v_snd_1953_) == 0)
{
uint8_t v___x_1954_; 
v___x_1954_ = 1;
return v___x_1954_;
}
else
{
lean_object* v_tail_1955_; 
v_tail_1955_ = lean_ctor_get(v_x_1950_, 1);
v_x_1950_ = v_tail_1955_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1___boxed(lean_object* v_x_1957_){
_start:
{
uint8_t v_res_1958_; lean_object* v_r_1959_; 
v_res_1958_ = lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1(v_x_1957_);
lean_dec(v_x_1957_);
v_r_1959_ = lean_box(v_res_1958_);
return v_r_1959_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__1(lean_object* v_site_1960_, lean_object* v_key_1961_, lean_object* v_depth_1962_, lean_object* v_child_1963_, lean_object* v_val_1964_, lean_object* v_budgets_1965_, lean_object* v_argv_1966_, lean_object* v_s_1967_){
_start:
{
uint8_t v___x_1968_; 
v___x_1968_ = lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1(v_argv_1966_);
if (v___x_1968_ == 0)
{
lean_object* v___f_1969_; lean_object* v___x_1970_; lean_object* v___x_1971_; 
v___f_1969_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalCall___redArg___lam__0___boxed), 7, 6);
lean_closure_set(v___f_1969_, 0, v_site_1960_);
lean_closure_set(v___f_1969_, 1, v_key_1961_);
lean_closure_set(v___f_1969_, 2, v_depth_1962_);
lean_closure_set(v___f_1969_, 3, v_child_1963_);
lean_closure_set(v___f_1969_, 4, v_val_1964_);
lean_closure_set(v___f_1969_, 5, v_argv_1966_);
v___x_1970_ = lp_algalVerification_Algal_Source_step(v_budgets_1965_, v_s_1967_);
v___x_1971_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_1970_, v___f_1969_);
return v___x_1971_;
}
else
{
lean_object* v___x_1972_; lean_object* v___x_1973_; 
lean_dec(v_argv_1966_);
lean_dec_ref(v_val_1964_);
lean_dec_ref(v_child_1963_);
lean_dec(v_depth_1962_);
lean_dec_ref(v_key_1961_);
lean_dec_ref(v_site_1960_);
v___x_1972_ = lean_box(1);
v___x_1973_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1973_, 0, v___x_1972_);
lean_ctor_set(v___x_1973_, 1, v_s_1967_);
return v___x_1973_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___lam__1___boxed(lean_object* v_site_1974_, lean_object* v_key_1975_, lean_object* v_depth_1976_, lean_object* v_child_1977_, lean_object* v_val_1978_, lean_object* v_budgets_1979_, lean_object* v_argv_1980_, lean_object* v_s_1981_){
_start:
{
lean_object* v_res_1982_; 
v_res_1982_ = lp_algalVerification_Algal_Source_evalCall___redArg___lam__1(v_site_1974_, v_key_1975_, v_depth_1976_, v_child_1977_, v_val_1978_, v_budgets_1979_, v_argv_1980_, v_s_1981_);
lean_dec_ref(v_budgets_1979_);
return v_res_1982_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0(lean_object* v_fst_1983_, lean_object* v_x_1984_){
_start:
{
if (lean_obj_tag(v_x_1984_) == 0)
{
lean_object* v___x_1985_; 
v___x_1985_ = lean_box(0);
return v___x_1985_;
}
else
{
lean_object* v_head_1986_; lean_object* v_tail_1987_; lean_object* v_fst_1988_; uint8_t v___x_1989_; 
v_head_1986_ = lean_ctor_get(v_x_1984_, 0);
v_tail_1987_ = lean_ctor_get(v_x_1984_, 1);
v_fst_1988_ = lean_ctor_get(v_head_1986_, 0);
v___x_1989_ = lean_string_dec_eq(v_fst_1988_, v_fst_1983_);
if (v___x_1989_ == 0)
{
v_x_1984_ = v_tail_1987_;
goto _start;
}
else
{
lean_object* v___x_1991_; 
lean_inc(v_head_1986_);
v___x_1991_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1991_, 0, v_head_1986_);
return v___x_1991_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0___boxed(lean_object* v_fst_1992_, lean_object* v_x_1993_){
_start:
{
lean_object* v_res_1994_; 
v_res_1994_ = lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0(v_fst_1992_, v_x_1993_);
lean_dec(v_x_1993_);
lean_dec_ref(v_fst_1992_);
return v_res_1994_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2(lean_object* v_args_1995_, lean_object* v_a_1996_, lean_object* v_a_1997_){
_start:
{
if (lean_obj_tag(v_a_1996_) == 0)
{
lean_object* v___x_1998_; 
v___x_1998_ = l_List_reverse___redArg(v_a_1997_);
return v___x_1998_;
}
else
{
lean_object* v_head_1999_; lean_object* v_tail_2000_; lean_object* v___x_2002_; uint8_t v_isShared_2003_; uint8_t v_isSharedCheck_2038_; 
v_head_1999_ = lean_ctor_get(v_a_1996_, 0);
v_tail_2000_ = lean_ctor_get(v_a_1996_, 1);
v_isSharedCheck_2038_ = !lean_is_exclusive(v_a_1996_);
if (v_isSharedCheck_2038_ == 0)
{
v___x_2002_ = v_a_1996_;
v_isShared_2003_ = v_isSharedCheck_2038_;
goto v_resetjp_2001_;
}
else
{
lean_inc(v_tail_2000_);
lean_inc(v_head_1999_);
lean_dec(v_a_1996_);
v___x_2002_ = lean_box(0);
v_isShared_2003_ = v_isSharedCheck_2038_;
goto v_resetjp_2001_;
}
v_resetjp_2001_:
{
lean_object* v___y_2005_; lean_object* v_fst_2010_; lean_object* v___x_2012_; uint8_t v_isShared_2013_; uint8_t v_isSharedCheck_2036_; 
v_fst_2010_ = lean_ctor_get(v_head_1999_, 0);
v_isSharedCheck_2036_ = !lean_is_exclusive(v_head_1999_);
if (v_isSharedCheck_2036_ == 0)
{
lean_object* v_unused_2037_; 
v_unused_2037_ = lean_ctor_get(v_head_1999_, 1);
lean_dec(v_unused_2037_);
v___x_2012_ = v_head_1999_;
v_isShared_2013_ = v_isSharedCheck_2036_;
goto v_resetjp_2011_;
}
else
{
lean_inc(v_fst_2010_);
lean_dec(v_head_1999_);
v___x_2012_ = lean_box(0);
v_isShared_2013_ = v_isSharedCheck_2036_;
goto v_resetjp_2011_;
}
v___jp_2004_:
{
lean_object* v___x_2007_; 
if (v_isShared_2003_ == 0)
{
lean_ctor_set(v___x_2002_, 1, v_a_1997_);
lean_ctor_set(v___x_2002_, 0, v___y_2005_);
v___x_2007_ = v___x_2002_;
goto v_reusejp_2006_;
}
else
{
lean_object* v_reuseFailAlloc_2009_; 
v_reuseFailAlloc_2009_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2009_, 0, v___y_2005_);
lean_ctor_set(v_reuseFailAlloc_2009_, 1, v_a_1997_);
v___x_2007_ = v_reuseFailAlloc_2009_;
goto v_reusejp_2006_;
}
v_reusejp_2006_:
{
v_a_1996_ = v_tail_2000_;
v_a_1997_ = v___x_2007_;
goto _start;
}
}
v_resetjp_2011_:
{
lean_object* v___x_2014_; 
v___x_2014_ = lp_algalVerification_List_find_x3f___at___00Algal_Source_evalCall_spec__0(v_fst_2010_, v_args_1995_);
if (lean_obj_tag(v___x_2014_) == 0)
{
lean_object* v___x_2015_; lean_object* v___x_2017_; 
v___x_2015_ = lean_box(0);
if (v_isShared_2013_ == 0)
{
lean_ctor_set(v___x_2012_, 1, v___x_2015_);
v___x_2017_ = v___x_2012_;
goto v_reusejp_2016_;
}
else
{
lean_object* v_reuseFailAlloc_2018_; 
v_reuseFailAlloc_2018_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2018_, 0, v_fst_2010_);
lean_ctor_set(v_reuseFailAlloc_2018_, 1, v___x_2015_);
v___x_2017_ = v_reuseFailAlloc_2018_;
goto v_reusejp_2016_;
}
v_reusejp_2016_:
{
v___y_2005_ = v___x_2017_;
goto v___jp_2004_;
}
}
else
{
lean_object* v_val_2019_; lean_object* v___x_2021_; uint8_t v_isShared_2022_; uint8_t v_isSharedCheck_2035_; 
lean_del_object(v___x_2012_);
v_val_2019_ = lean_ctor_get(v___x_2014_, 0);
v_isSharedCheck_2035_ = !lean_is_exclusive(v___x_2014_);
if (v_isSharedCheck_2035_ == 0)
{
v___x_2021_ = v___x_2014_;
v_isShared_2022_ = v_isSharedCheck_2035_;
goto v_resetjp_2020_;
}
else
{
lean_inc(v_val_2019_);
lean_dec(v___x_2014_);
v___x_2021_ = lean_box(0);
v_isShared_2022_ = v_isSharedCheck_2035_;
goto v_resetjp_2020_;
}
v_resetjp_2020_:
{
lean_object* v_snd_2023_; lean_object* v___x_2025_; uint8_t v_isShared_2026_; uint8_t v_isSharedCheck_2033_; 
v_snd_2023_ = lean_ctor_get(v_val_2019_, 1);
v_isSharedCheck_2033_ = !lean_is_exclusive(v_val_2019_);
if (v_isSharedCheck_2033_ == 0)
{
lean_object* v_unused_2034_; 
v_unused_2034_ = lean_ctor_get(v_val_2019_, 0);
lean_dec(v_unused_2034_);
v___x_2025_ = v_val_2019_;
v_isShared_2026_ = v_isSharedCheck_2033_;
goto v_resetjp_2024_;
}
else
{
lean_inc(v_snd_2023_);
lean_dec(v_val_2019_);
v___x_2025_ = lean_box(0);
v_isShared_2026_ = v_isSharedCheck_2033_;
goto v_resetjp_2024_;
}
v_resetjp_2024_:
{
lean_object* v___x_2028_; 
if (v_isShared_2022_ == 0)
{
lean_ctor_set(v___x_2021_, 0, v_snd_2023_);
v___x_2028_ = v___x_2021_;
goto v_reusejp_2027_;
}
else
{
lean_object* v_reuseFailAlloc_2032_; 
v_reuseFailAlloc_2032_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2032_, 0, v_snd_2023_);
v___x_2028_ = v_reuseFailAlloc_2032_;
goto v_reusejp_2027_;
}
v_reusejp_2027_:
{
lean_object* v___x_2030_; 
if (v_isShared_2026_ == 0)
{
lean_ctor_set(v___x_2025_, 1, v___x_2028_);
lean_ctor_set(v___x_2025_, 0, v_fst_2010_);
v___x_2030_ = v___x_2025_;
goto v_reusejp_2029_;
}
else
{
lean_object* v_reuseFailAlloc_2031_; 
v_reuseFailAlloc_2031_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2031_, 0, v_fst_2010_);
lean_ctor_set(v_reuseFailAlloc_2031_, 1, v___x_2028_);
v___x_2030_ = v_reuseFailAlloc_2031_;
goto v_reusejp_2029_;
}
v_reusejp_2029_:
{
v___y_2005_ = v___x_2030_;
goto v___jp_2004_;
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
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2___boxed(lean_object* v_args_2039_, lean_object* v_a_2040_, lean_object* v_a_2041_){
_start:
{
lean_object* v_res_2042_; 
v_res_2042_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2(v_args_2039_, v_a_2040_, v_a_2041_);
lean_dec(v_args_2039_);
return v_res_2042_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg(lean_object* v_budgets_2043_, lean_object* v_child_2044_, lean_object* v_fuel_2045_, lean_object* v_mod_2046_, lean_object* v_env_2047_, lean_object* v_site_2048_, lean_object* v_depth_2049_, lean_object* v_alias_2050_, lean_object* v_args_2051_, lean_object* v_s_2052_){
_start:
{
lean_object* v_zero_2056_; uint8_t v_isZero_2057_; 
v_zero_2056_ = lean_unsigned_to_nat(0u);
v_isZero_2057_ = lean_nat_dec_eq(v_fuel_2045_, v_zero_2056_);
if (v_isZero_2057_ == 1)
{
lean_dec(v_depth_2049_);
lean_dec_ref(v_site_2048_);
lean_dec_ref(v_child_2044_);
lean_dec_ref(v_budgets_2043_);
goto v___jp_2053_;
}
else
{
lean_object* v_imports_2058_; lean_object* v___x_2059_; 
v_imports_2058_ = lean_ctor_get(v_mod_2046_, 2);
v___x_2059_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_alias_2050_, v_imports_2058_);
if (lean_obj_tag(v___x_2059_) == 0)
{
lean_dec(v_depth_2049_);
lean_dec_ref(v_site_2048_);
lean_dec_ref(v_child_2044_);
lean_dec_ref(v_budgets_2043_);
goto v___jp_2053_;
}
else
{
lean_object* v_val_2060_; lean_object* v_program_2061_; lean_object* v_key_2062_; lean_object* v_parameters_2063_; lean_object* v_one_2064_; lean_object* v_n_2065_; lean_object* v___f_2066_; lean_object* v___x_2067_; lean_object* v_ordered_2068_; lean_object* v___x_2069_; lean_object* v___x_2070_; 
v_val_2060_ = lean_ctor_get(v___x_2059_, 0);
lean_inc(v_val_2060_);
lean_dec_ref_known(v___x_2059_, 1);
v_program_2061_ = lean_ctor_get(v_val_2060_, 1);
v_key_2062_ = lean_ctor_get(v_val_2060_, 0);
lean_inc_ref(v_key_2062_);
v_parameters_2063_ = lean_ctor_get(v_program_2061_, 1);
lean_inc(v_parameters_2063_);
v_one_2064_ = lean_unsigned_to_nat(1u);
v_n_2065_ = lean_nat_sub(v_fuel_2045_, v_one_2064_);
lean_inc_ref(v_budgets_2043_);
v___f_2066_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalCall___redArg___lam__1___boxed), 8, 6);
lean_closure_set(v___f_2066_, 0, v_site_2048_);
lean_closure_set(v___f_2066_, 1, v_key_2062_);
lean_closure_set(v___f_2066_, 2, v_depth_2049_);
lean_closure_set(v___f_2066_, 3, v_child_2044_);
lean_closure_set(v___f_2066_, 4, v_val_2060_);
lean_closure_set(v___f_2066_, 5, v_budgets_2043_);
v___x_2067_ = lean_box(0);
v_ordered_2068_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2(v_args_2051_, v_parameters_2063_, v___x_2067_);
v___x_2069_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_2043_, v_n_2065_, v_ordered_2068_, v_env_2047_, v_s_2052_);
lean_dec(v_n_2065_);
lean_dec_ref(v_budgets_2043_);
v___x_2070_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2069_, v___f_2066_);
return v___x_2070_;
}
}
v___jp_2053_:
{
lean_object* v___x_2054_; lean_object* v___x_2055_; 
v___x_2054_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2055_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2055_, 0, v___x_2054_);
lean_ctor_set(v___x_2055_, 1, v_s_2052_);
return v___x_2055_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___redArg___boxed(lean_object* v_budgets_2071_, lean_object* v_child_2072_, lean_object* v_fuel_2073_, lean_object* v_mod_2074_, lean_object* v_env_2075_, lean_object* v_site_2076_, lean_object* v_depth_2077_, lean_object* v_alias_2078_, lean_object* v_args_2079_, lean_object* v_s_2080_){
_start:
{
lean_object* v_res_2081_; 
v_res_2081_ = lp_algalVerification_Algal_Source_evalCall___redArg(v_budgets_2071_, v_child_2072_, v_fuel_2073_, v_mod_2074_, v_env_2075_, v_site_2076_, v_depth_2077_, v_alias_2078_, v_args_2079_, v_s_2080_);
lean_dec(v_args_2079_);
lean_dec_ref(v_alias_2078_);
lean_dec(v_env_2075_);
lean_dec_ref(v_mod_2074_);
lean_dec(v_fuel_2073_);
return v_res_2081_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall(lean_object* v_budgets_2082_, lean_object* v_oracle_2083_, lean_object* v_child_2084_, lean_object* v_fuel_2085_, lean_object* v_mod_2086_, lean_object* v_env_2087_, lean_object* v_site_2088_, lean_object* v_depth_2089_, lean_object* v_alias_2090_, lean_object* v_args_2091_, lean_object* v_s_2092_){
_start:
{
lean_object* v___x_2093_; 
v___x_2093_ = lp_algalVerification_Algal_Source_evalCall___redArg(v_budgets_2082_, v_child_2084_, v_fuel_2085_, v_mod_2086_, v_env_2087_, v_site_2088_, v_depth_2089_, v_alias_2090_, v_args_2091_, v_s_2092_);
return v___x_2093_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalCall___boxed(lean_object* v_budgets_2094_, lean_object* v_oracle_2095_, lean_object* v_child_2096_, lean_object* v_fuel_2097_, lean_object* v_mod_2098_, lean_object* v_env_2099_, lean_object* v_site_2100_, lean_object* v_depth_2101_, lean_object* v_alias_2102_, lean_object* v_args_2103_, lean_object* v_s_2104_){
_start:
{
lean_object* v_res_2105_; 
v_res_2105_ = lp_algalVerification_Algal_Source_evalCall(v_budgets_2094_, v_oracle_2095_, v_child_2096_, v_fuel_2097_, v_mod_2098_, v_env_2099_, v_site_2100_, v_depth_2101_, v_alias_2102_, v_args_2103_, v_s_2104_);
lean_dec(v_args_2103_);
lean_dec_ref(v_alias_2102_);
lean_dec(v_env_2099_);
lean_dec_ref(v_mod_2098_);
lean_dec(v_fuel_2097_);
lean_dec_ref(v_oracle_2095_);
return v_res_2105_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__0(lean_object* v_v_2106_, lean_object* v_s_2107_){
_start:
{
lean_object* v___x_2108_; lean_object* v___x_2109_; 
v___x_2108_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_2108_, 0, v_v_2106_);
v___x_2109_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2109_, 0, v___x_2108_);
lean_ctor_set(v___x_2109_, 1, v_s_2107_);
return v___x_2109_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__1(lean_object* v_budgets_2110_, lean_object* v_v_2111_, lean_object* v_s_2112_){
_start:
{
lean_object* v___f_2113_; lean_object* v___x_2114_; lean_object* v___x_2115_; 
v___f_2113_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__0), 2, 1);
lean_closure_set(v___f_2113_, 0, v_v_2111_);
v___x_2114_ = lp_algalVerification_Algal_Source_step(v_budgets_2110_, v_s_2112_);
v___x_2115_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2114_, v___f_2113_);
return v___x_2115_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__1___boxed(lean_object* v_budgets_2116_, lean_object* v_v_2117_, lean_object* v_s_2118_){
_start:
{
lean_object* v_res_2119_; 
v_res_2119_ = lp_algalVerification_Algal_Source_evalEach___redArg___lam__1(v_budgets_2116_, v_v_2117_, v_s_2118_);
lean_dec_ref(v_budgets_2116_);
return v_res_2119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__2(lean_object* v_depth_2120_, lean_object* v_child_2121_, lean_object* v_n_2122_, lean_object* v_val_2123_, lean_object* v_over_2124_, lean_object* v_argv_2125_, lean_object* v_list_2126_, lean_object* v_site_2127_, lean_object* v___f_2128_, lean_object* v_s_2129_){
_start:
{
lean_object* v___x_2130_; lean_object* v___x_2131_; lean_object* v___x_2132_; lean_object* v___x_2133_; lean_object* v___x_2134_; lean_object* v___x_2135_; 
v___x_2130_ = lean_unsigned_to_nat(0u);
v___x_2131_ = lean_unsigned_to_nat(1u);
v___x_2132_ = lean_nat_add(v_depth_2120_, v___x_2131_);
v___x_2133_ = lean_box(0);
v___x_2134_ = lp_algalVerification_Algal_Source_eachItems___redArg(v_child_2121_, v_n_2122_, v_val_2123_, v_over_2124_, v_argv_2125_, v_list_2126_, v___x_2130_, v_site_2127_, v___x_2132_, v_s_2129_, v___x_2133_);
v___x_2135_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2134_, v___f_2128_);
return v___x_2135_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__2___boxed(lean_object* v_depth_2136_, lean_object* v_child_2137_, lean_object* v_n_2138_, lean_object* v_val_2139_, lean_object* v_over_2140_, lean_object* v_argv_2141_, lean_object* v_list_2142_, lean_object* v_site_2143_, lean_object* v___f_2144_, lean_object* v_s_2145_){
_start:
{
lean_object* v_res_2146_; 
v_res_2146_ = lp_algalVerification_Algal_Source_evalEach___redArg___lam__2(v_depth_2136_, v_child_2137_, v_n_2138_, v_val_2139_, v_over_2140_, v_argv_2141_, v_list_2142_, v_site_2143_, v___f_2144_, v_s_2145_);
lean_dec(v_depth_2136_);
return v_res_2146_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__3(lean_object* v_depth_2147_, lean_object* v_child_2148_, lean_object* v_n_2149_, lean_object* v_val_2150_, lean_object* v_over_2151_, lean_object* v_list_2152_, lean_object* v_site_2153_, lean_object* v___f_2154_, lean_object* v_budgets_2155_, lean_object* v_argv_2156_, lean_object* v_s_2157_){
_start:
{
uint8_t v___x_2158_; 
v___x_2158_ = lp_algalVerification_List_any___at___00Algal_Source_evalCall_spec__1(v_argv_2156_);
if (v___x_2158_ == 0)
{
lean_object* v___f_2159_; lean_object* v___x_2160_; lean_object* v___x_2161_; 
v___f_2159_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__2___boxed), 10, 9);
lean_closure_set(v___f_2159_, 0, v_depth_2147_);
lean_closure_set(v___f_2159_, 1, v_child_2148_);
lean_closure_set(v___f_2159_, 2, v_n_2149_);
lean_closure_set(v___f_2159_, 3, v_val_2150_);
lean_closure_set(v___f_2159_, 4, v_over_2151_);
lean_closure_set(v___f_2159_, 5, v_argv_2156_);
lean_closure_set(v___f_2159_, 6, v_list_2152_);
lean_closure_set(v___f_2159_, 7, v_site_2153_);
lean_closure_set(v___f_2159_, 8, v___f_2154_);
v___x_2160_ = lp_algalVerification_Algal_Source_step(v_budgets_2155_, v_s_2157_);
v___x_2161_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2160_, v___f_2159_);
return v___x_2161_;
}
else
{
lean_object* v___x_2162_; lean_object* v___x_2163_; 
lean_dec(v_argv_2156_);
lean_dec_ref(v___f_2154_);
lean_dec_ref(v_site_2153_);
lean_dec(v_list_2152_);
lean_dec_ref(v_over_2151_);
lean_dec_ref(v_val_2150_);
lean_dec(v_n_2149_);
lean_dec_ref(v_child_2148_);
lean_dec(v_depth_2147_);
v___x_2162_ = lean_box(1);
v___x_2163_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2163_, 0, v___x_2162_);
lean_ctor_set(v___x_2163_, 1, v_s_2157_);
return v___x_2163_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__3___boxed(lean_object* v_depth_2164_, lean_object* v_child_2165_, lean_object* v_n_2166_, lean_object* v_val_2167_, lean_object* v_over_2168_, lean_object* v_list_2169_, lean_object* v_site_2170_, lean_object* v___f_2171_, lean_object* v_budgets_2172_, lean_object* v_argv_2173_, lean_object* v_s_2174_){
_start:
{
lean_object* v_res_2175_; 
v_res_2175_ = lp_algalVerification_Algal_Source_evalEach___redArg___lam__3(v_depth_2164_, v_child_2165_, v_n_2166_, v_val_2167_, v_over_2168_, v_list_2169_, v_site_2170_, v___f_2171_, v_budgets_2172_, v_argv_2173_, v_s_2174_);
lean_dec_ref(v_budgets_2172_);
return v_res_2175_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0(lean_object* v_over_2176_, lean_object* v_a_2177_, lean_object* v_a_2178_){
_start:
{
if (lean_obj_tag(v_a_2177_) == 0)
{
lean_object* v___x_2179_; 
v___x_2179_ = l_List_reverse___redArg(v_a_2178_);
return v___x_2179_;
}
else
{
lean_object* v_head_2180_; lean_object* v_tail_2181_; lean_object* v___x_2183_; uint8_t v_isShared_2184_; uint8_t v_isSharedCheck_2192_; 
v_head_2180_ = lean_ctor_get(v_a_2177_, 0);
v_tail_2181_ = lean_ctor_get(v_a_2177_, 1);
v_isSharedCheck_2192_ = !lean_is_exclusive(v_a_2177_);
if (v_isSharedCheck_2192_ == 0)
{
v___x_2183_ = v_a_2177_;
v_isShared_2184_ = v_isSharedCheck_2192_;
goto v_resetjp_2182_;
}
else
{
lean_inc(v_tail_2181_);
lean_inc(v_head_2180_);
lean_dec(v_a_2177_);
v___x_2183_ = lean_box(0);
v_isShared_2184_ = v_isSharedCheck_2192_;
goto v_resetjp_2182_;
}
v_resetjp_2182_:
{
lean_object* v_fst_2185_; uint8_t v___x_2186_; 
v_fst_2185_ = lean_ctor_get(v_head_2180_, 0);
v___x_2186_ = lean_string_dec_eq(v_fst_2185_, v_over_2176_);
if (v___x_2186_ == 0)
{
lean_object* v___x_2188_; 
if (v_isShared_2184_ == 0)
{
lean_ctor_set(v___x_2183_, 1, v_a_2178_);
v___x_2188_ = v___x_2183_;
goto v_reusejp_2187_;
}
else
{
lean_object* v_reuseFailAlloc_2190_; 
v_reuseFailAlloc_2190_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2190_, 0, v_head_2180_);
lean_ctor_set(v_reuseFailAlloc_2190_, 1, v_a_2178_);
v___x_2188_ = v_reuseFailAlloc_2190_;
goto v_reusejp_2187_;
}
v_reusejp_2187_:
{
v_a_2177_ = v_tail_2181_;
v_a_2178_ = v___x_2188_;
goto _start;
}
}
else
{
lean_del_object(v___x_2183_);
lean_dec(v_head_2180_);
v_a_2177_ = v_tail_2181_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0___boxed(lean_object* v_over_2193_, lean_object* v_a_2194_, lean_object* v_a_2195_){
_start:
{
lean_object* v_res_2196_; 
v_res_2196_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0(v_over_2193_, v_a_2194_, v_a_2195_);
lean_dec_ref(v_over_2193_);
return v_res_2196_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__4(lean_object* v_maxItems_2197_, lean_object* v_val_2198_, lean_object* v_depth_2199_, lean_object* v_child_2200_, lean_object* v_n_2201_, lean_object* v_over_2202_, lean_object* v_site_2203_, lean_object* v___f_2204_, lean_object* v_budgets_2205_, lean_object* v_args_2206_, lean_object* v_env_2207_, lean_object* v_packed_2208_, lean_object* v_s_2209_){
_start:
{
if (lean_obj_tag(v_packed_2208_) == 4)
{
lean_object* v_values_2210_; lean_object* v_list_2211_; lean_object* v___x_2212_; uint8_t v___x_2213_; 
v_values_2210_ = lean_ctor_get(v_packed_2208_, 0);
lean_inc(v_values_2210_);
lean_dec_ref_known(v_packed_2208_, 1);
v_list_2211_ = lp_algalVerification_Algal_Source_listOf(v_values_2210_);
v___x_2212_ = l_List_lengthTR___redArg(v_list_2211_);
v___x_2213_ = lean_nat_dec_lt(v_maxItems_2197_, v___x_2212_);
lean_dec(v___x_2212_);
if (v___x_2213_ == 0)
{
lean_object* v_program_2214_; lean_object* v_parameters_2215_; lean_object* v___f_2216_; lean_object* v___x_2217_; lean_object* v___x_2218_; lean_object* v_ordered_2219_; lean_object* v___x_2220_; lean_object* v___x_2221_; 
v_program_2214_ = lean_ctor_get(v_val_2198_, 1);
v_parameters_2215_ = lean_ctor_get(v_program_2214_, 1);
lean_inc(v_parameters_2215_);
lean_inc_ref(v_budgets_2205_);
lean_inc_ref(v_over_2202_);
lean_inc(v_n_2201_);
v___f_2216_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__3___boxed), 11, 9);
lean_closure_set(v___f_2216_, 0, v_depth_2199_);
lean_closure_set(v___f_2216_, 1, v_child_2200_);
lean_closure_set(v___f_2216_, 2, v_n_2201_);
lean_closure_set(v___f_2216_, 3, v_val_2198_);
lean_closure_set(v___f_2216_, 4, v_over_2202_);
lean_closure_set(v___f_2216_, 5, v_list_2211_);
lean_closure_set(v___f_2216_, 6, v_site_2203_);
lean_closure_set(v___f_2216_, 7, v___f_2204_);
lean_closure_set(v___f_2216_, 8, v_budgets_2205_);
v___x_2217_ = lean_box(0);
v___x_2218_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Source_evalEach_spec__0(v_over_2202_, v_parameters_2215_, v___x_2217_);
lean_dec_ref(v_over_2202_);
v_ordered_2219_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalCall_spec__2(v_args_2206_, v___x_2218_, v___x_2217_);
v___x_2220_ = lp_algalVerification_Algal_Source_evalArgs(v_budgets_2205_, v_n_2201_, v_ordered_2219_, v_env_2207_, v_s_2209_);
lean_dec(v_n_2201_);
lean_dec_ref(v_budgets_2205_);
v___x_2221_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2220_, v___f_2216_);
return v___x_2221_;
}
else
{
lean_object* v___x_2222_; lean_object* v___x_2223_; 
lean_dec(v_list_2211_);
lean_dec_ref(v_budgets_2205_);
lean_dec_ref(v___f_2204_);
lean_dec_ref(v_site_2203_);
lean_dec_ref(v_over_2202_);
lean_dec(v_n_2201_);
lean_dec_ref(v_child_2200_);
lean_dec(v_depth_2199_);
lean_dec_ref(v_val_2198_);
v___x_2222_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalCell___closed__0));
v___x_2223_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2223_, 0, v___x_2222_);
lean_ctor_set(v___x_2223_, 1, v_s_2209_);
return v___x_2223_;
}
}
else
{
lean_object* v___x_2224_; lean_object* v___x_2225_; 
lean_dec(v_packed_2208_);
lean_dec_ref(v_budgets_2205_);
lean_dec_ref(v___f_2204_);
lean_dec_ref(v_site_2203_);
lean_dec_ref(v_over_2202_);
lean_dec(v_n_2201_);
lean_dec_ref(v_child_2200_);
lean_dec(v_depth_2199_);
lean_dec_ref(v_val_2198_);
v___x_2224_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
v___x_2225_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2225_, 0, v___x_2224_);
lean_ctor_set(v___x_2225_, 1, v_s_2209_);
return v___x_2225_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___lam__4___boxed(lean_object* v_maxItems_2226_, lean_object* v_val_2227_, lean_object* v_depth_2228_, lean_object* v_child_2229_, lean_object* v_n_2230_, lean_object* v_over_2231_, lean_object* v_site_2232_, lean_object* v___f_2233_, lean_object* v_budgets_2234_, lean_object* v_args_2235_, lean_object* v_env_2236_, lean_object* v_packed_2237_, lean_object* v_s_2238_){
_start:
{
lean_object* v_res_2239_; 
v_res_2239_ = lp_algalVerification_Algal_Source_evalEach___redArg___lam__4(v_maxItems_2226_, v_val_2227_, v_depth_2228_, v_child_2229_, v_n_2230_, v_over_2231_, v_site_2232_, v___f_2233_, v_budgets_2234_, v_args_2235_, v_env_2236_, v_packed_2237_, v_s_2238_);
lean_dec(v_env_2236_);
lean_dec(v_args_2235_);
lean_dec(v_maxItems_2226_);
return v_res_2239_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg(lean_object* v_budgets_2240_, lean_object* v_child_2241_, lean_object* v_fuel_2242_, lean_object* v_mod_2243_, lean_object* v_env_2244_, lean_object* v_site_2245_, lean_object* v_depth_2246_, lean_object* v_alias_2247_, lean_object* v_over_2248_, lean_object* v_items_2249_, lean_object* v_args_2250_, lean_object* v_maxItems_2251_, lean_object* v_s_2252_){
_start:
{
lean_object* v_zero_2256_; uint8_t v_isZero_2257_; 
v_zero_2256_ = lean_unsigned_to_nat(0u);
v_isZero_2257_ = lean_nat_dec_eq(v_fuel_2242_, v_zero_2256_);
if (v_isZero_2257_ == 1)
{
lean_dec(v_maxItems_2251_);
lean_dec(v_args_2250_);
lean_dec_ref(v_items_2249_);
lean_dec_ref(v_over_2248_);
lean_dec(v_depth_2246_);
lean_dec_ref(v_site_2245_);
lean_dec(v_env_2244_);
lean_dec_ref(v_child_2241_);
lean_dec_ref(v_budgets_2240_);
goto v___jp_2253_;
}
else
{
lean_object* v_imports_2258_; lean_object* v___x_2259_; 
v_imports_2258_ = lean_ctor_get(v_mod_2243_, 2);
v___x_2259_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_alias_2247_, v_imports_2258_);
if (lean_obj_tag(v___x_2259_) == 0)
{
lean_dec(v_maxItems_2251_);
lean_dec(v_args_2250_);
lean_dec_ref(v_items_2249_);
lean_dec_ref(v_over_2248_);
lean_dec(v_depth_2246_);
lean_dec_ref(v_site_2245_);
lean_dec(v_env_2244_);
lean_dec_ref(v_child_2241_);
lean_dec_ref(v_budgets_2240_);
goto v___jp_2253_;
}
else
{
lean_object* v_val_2260_; lean_object* v___f_2261_; lean_object* v_one_2262_; lean_object* v_n_2263_; lean_object* v___f_2264_; lean_object* v___x_2265_; lean_object* v___x_2266_; 
v_val_2260_ = lean_ctor_get(v___x_2259_, 0);
lean_inc(v_val_2260_);
lean_dec_ref_known(v___x_2259_, 1);
lean_inc_ref_n(v_budgets_2240_, 2);
v___f_2261_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__1___boxed), 3, 1);
lean_closure_set(v___f_2261_, 0, v_budgets_2240_);
v_one_2262_ = lean_unsigned_to_nat(1u);
v_n_2263_ = lean_nat_sub(v_fuel_2242_, v_one_2262_);
lean_inc(v_env_2244_);
v___f_2264_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__4___boxed), 13, 11);
lean_closure_set(v___f_2264_, 0, v_maxItems_2251_);
lean_closure_set(v___f_2264_, 1, v_val_2260_);
lean_closure_set(v___f_2264_, 2, v_depth_2246_);
lean_closure_set(v___f_2264_, 3, v_child_2241_);
lean_closure_set(v___f_2264_, 4, v_n_2263_);
lean_closure_set(v___f_2264_, 5, v_over_2248_);
lean_closure_set(v___f_2264_, 6, v_site_2245_);
lean_closure_set(v___f_2264_, 7, v___f_2261_);
lean_closure_set(v___f_2264_, 8, v_budgets_2240_);
lean_closure_set(v___f_2264_, 9, v_args_2250_);
lean_closure_set(v___f_2264_, 10, v_env_2244_);
v___x_2265_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2240_, v_items_2249_, v_env_2244_, v_s_2252_);
lean_dec(v_env_2244_);
lean_dec_ref(v_budgets_2240_);
v___x_2266_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2265_, v___f_2264_);
return v___x_2266_;
}
}
v___jp_2253_:
{
lean_object* v___x_2254_; lean_object* v___x_2255_; 
v___x_2254_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2255_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2255_, 0, v___x_2254_);
lean_ctor_set(v___x_2255_, 1, v_s_2252_);
return v___x_2255_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___redArg___boxed(lean_object* v_budgets_2267_, lean_object* v_child_2268_, lean_object* v_fuel_2269_, lean_object* v_mod_2270_, lean_object* v_env_2271_, lean_object* v_site_2272_, lean_object* v_depth_2273_, lean_object* v_alias_2274_, lean_object* v_over_2275_, lean_object* v_items_2276_, lean_object* v_args_2277_, lean_object* v_maxItems_2278_, lean_object* v_s_2279_){
_start:
{
lean_object* v_res_2280_; 
v_res_2280_ = lp_algalVerification_Algal_Source_evalEach___redArg(v_budgets_2267_, v_child_2268_, v_fuel_2269_, v_mod_2270_, v_env_2271_, v_site_2272_, v_depth_2273_, v_alias_2274_, v_over_2275_, v_items_2276_, v_args_2277_, v_maxItems_2278_, v_s_2279_);
lean_dec_ref(v_alias_2274_);
lean_dec_ref(v_mod_2270_);
lean_dec(v_fuel_2269_);
return v_res_2280_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach(lean_object* v_budgets_2281_, lean_object* v_oracle_2282_, lean_object* v_child_2283_, lean_object* v_fuel_2284_, lean_object* v_mod_2285_, lean_object* v_env_2286_, lean_object* v_site_2287_, lean_object* v_depth_2288_, lean_object* v_alias_2289_, lean_object* v_over_2290_, lean_object* v_items_2291_, lean_object* v_args_2292_, lean_object* v_maxItems_2293_, lean_object* v_s_2294_){
_start:
{
lean_object* v___x_2295_; 
v___x_2295_ = lp_algalVerification_Algal_Source_evalEach___redArg(v_budgets_2281_, v_child_2283_, v_fuel_2284_, v_mod_2285_, v_env_2286_, v_site_2287_, v_depth_2288_, v_alias_2289_, v_over_2290_, v_items_2291_, v_args_2292_, v_maxItems_2293_, v_s_2294_);
return v___x_2295_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalEach___boxed(lean_object* v_budgets_2296_, lean_object* v_oracle_2297_, lean_object* v_child_2298_, lean_object* v_fuel_2299_, lean_object* v_mod_2300_, lean_object* v_env_2301_, lean_object* v_site_2302_, lean_object* v_depth_2303_, lean_object* v_alias_2304_, lean_object* v_over_2305_, lean_object* v_items_2306_, lean_object* v_args_2307_, lean_object* v_maxItems_2308_, lean_object* v_s_2309_){
_start:
{
lean_object* v_res_2310_; 
v_res_2310_ = lp_algalVerification_Algal_Source_evalEach(v_budgets_2296_, v_oracle_2297_, v_child_2298_, v_fuel_2299_, v_mod_2300_, v_env_2301_, v_site_2302_, v_depth_2303_, v_alias_2304_, v_over_2305_, v_items_2306_, v_args_2307_, v_maxItems_2308_, v_s_2309_);
lean_dec_ref(v_alias_2304_);
lean_dec_ref(v_mod_2300_);
lean_dec(v_fuel_2299_);
lean_dec_ref(v_oracle_2297_);
return v_res_2310_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1(lean_object* v_x_2311_){
_start:
{
if (lean_obj_tag(v_x_2311_) == 0)
{
uint8_t v___x_2312_; 
v___x_2312_ = 0;
return v___x_2312_;
}
else
{
lean_object* v_head_2313_; lean_object* v_tail_2314_; lean_object* v_snd_2315_; uint8_t v___x_2316_; 
v_head_2313_ = lean_ctor_get(v_x_2311_, 0);
v_tail_2314_ = lean_ctor_get(v_x_2311_, 1);
v_snd_2315_ = lean_ctor_get(v_head_2313_, 1);
v___x_2316_ = lp_algalVerification_Algal_Source_hasEffect(v_snd_2315_);
if (v___x_2316_ == 0)
{
v_x_2311_ = v_tail_2314_;
goto _start;
}
else
{
return v___x_2316_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1___boxed(lean_object* v_x_2318_){
_start:
{
uint8_t v_res_2319_; lean_object* v_r_2320_; 
v_res_2319_ = lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1(v_x_2318_);
lean_dec(v_x_2318_);
v_r_2320_ = lean_box(v_res_2319_);
return v_r_2320_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalTail_spec__2(lean_object* v_a_2321_, lean_object* v_a_2322_){
_start:
{
if (lean_obj_tag(v_a_2321_) == 0)
{
lean_object* v___x_2323_; 
v___x_2323_ = l_List_reverse___redArg(v_a_2322_);
return v___x_2323_;
}
else
{
lean_object* v_head_2324_; lean_object* v_tail_2325_; lean_object* v___x_2327_; uint8_t v_isShared_2328_; uint8_t v_isSharedCheck_2334_; 
v_head_2324_ = lean_ctor_get(v_a_2321_, 0);
v_tail_2325_ = lean_ctor_get(v_a_2321_, 1);
v_isSharedCheck_2334_ = !lean_is_exclusive(v_a_2321_);
if (v_isSharedCheck_2334_ == 0)
{
v___x_2327_ = v_a_2321_;
v_isShared_2328_ = v_isSharedCheck_2334_;
goto v_resetjp_2326_;
}
else
{
lean_inc(v_tail_2325_);
lean_inc(v_head_2324_);
lean_dec(v_a_2321_);
v___x_2327_ = lean_box(0);
v_isShared_2328_ = v_isSharedCheck_2334_;
goto v_resetjp_2326_;
}
v_resetjp_2326_:
{
lean_object* v_fst_2329_; lean_object* v___x_2331_; 
v_fst_2329_ = lean_ctor_get(v_head_2324_, 0);
lean_inc(v_fst_2329_);
lean_dec(v_head_2324_);
if (v_isShared_2328_ == 0)
{
lean_ctor_set(v___x_2327_, 1, v_a_2322_);
lean_ctor_set(v___x_2327_, 0, v_fst_2329_);
v___x_2331_ = v___x_2327_;
goto v_reusejp_2330_;
}
else
{
lean_object* v_reuseFailAlloc_2333_; 
v_reuseFailAlloc_2333_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2333_, 0, v_fst_2329_);
lean_ctor_set(v_reuseFailAlloc_2333_, 1, v_a_2322_);
v___x_2331_ = v_reuseFailAlloc_2333_;
goto v_reusejp_2330_;
}
v_reusejp_2330_:
{
v_a_2321_ = v_tail_2325_;
v_a_2322_ = v___x_2331_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__0(lean_object* v_a_2335_, lean_object* v_s_2336_){
_start:
{
lean_object* v___x_2337_; lean_object* v___x_2338_; 
v___x_2337_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_2337_, 0, v_a_2335_);
v___x_2338_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2338_, 0, v___x_2337_);
lean_ctor_set(v___x_2338_, 1, v_s_2336_);
return v___x_2338_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1(lean_object* v_site_2341_, lean_object* v_question_2342_, lean_object* v_c_2343_, lean_object* v_oracle_2344_, lean_object* v_criteria_2345_, lean_object* v_budgets_2346_, lean_object* v_s_2347_){
_start:
{
lean_object* v_steps_2348_; lean_object* v_calls_2349_; lean_object* v_obs_2350_; lean_object* v_invocations_2351_; lean_object* v___x_2353_; uint8_t v_isShared_2354_; uint8_t v_isSharedCheck_2380_; 
v_steps_2348_ = lean_ctor_get(v_s_2347_, 0);
v_calls_2349_ = lean_ctor_get(v_s_2347_, 1);
v_obs_2350_ = lean_ctor_get(v_s_2347_, 2);
v_invocations_2351_ = lean_ctor_get(v_s_2347_, 3);
v_isSharedCheck_2380_ = !lean_is_exclusive(v_s_2347_);
if (v_isSharedCheck_2380_ == 0)
{
v___x_2353_ = v_s_2347_;
v_isShared_2354_ = v_isSharedCheck_2380_;
goto v_resetjp_2352_;
}
else
{
lean_inc(v_invocations_2351_);
lean_inc(v_obs_2350_);
lean_inc(v_calls_2349_);
lean_inc(v_steps_2348_);
lean_dec(v_s_2347_);
v___x_2353_ = lean_box(0);
v_isShared_2354_ = v_isSharedCheck_2380_;
goto v_resetjp_2352_;
}
v_resetjp_2352_:
{
lean_object* v___x_2355_; lean_object* v___x_2356_; lean_object* v___x_2357_; lean_object* v_obs_2358_; lean_object* v___x_2359_; lean_object* v___x_2360_; lean_object* v___x_2361_; lean_object* v_s_2363_; 
v___x_2355_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__1___closed__0));
v___x_2356_ = lean_string_append(v_site_2341_, v___x_2355_);
v___x_2357_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__1___closed__1));
v_obs_2358_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_obs_2358_, 0, v___x_2356_);
lean_ctor_set(v_obs_2358_, 1, v___x_2357_);
lean_ctor_set(v_obs_2358_, 2, v_question_2342_);
lean_ctor_set(v_obs_2358_, 3, v_c_2343_);
v___x_2359_ = lean_box(0);
lean_inc_ref(v_obs_2358_);
v___x_2360_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_2360_, 0, v_obs_2358_);
lean_ctor_set(v___x_2360_, 1, v___x_2359_);
v___x_2361_ = l_List_appendTR___redArg(v_obs_2350_, v___x_2360_);
if (v_isShared_2354_ == 0)
{
lean_ctor_set(v___x_2353_, 2, v___x_2361_);
v_s_2363_ = v___x_2353_;
goto v_reusejp_2362_;
}
else
{
lean_object* v_reuseFailAlloc_2379_; 
v_reuseFailAlloc_2379_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_2379_, 0, v_steps_2348_);
lean_ctor_set(v_reuseFailAlloc_2379_, 1, v_calls_2349_);
lean_ctor_set(v_reuseFailAlloc_2379_, 2, v___x_2361_);
lean_ctor_set(v_reuseFailAlloc_2379_, 3, v_invocations_2351_);
v_s_2363_ = v_reuseFailAlloc_2379_;
goto v_reusejp_2362_;
}
v_reusejp_2362_:
{
uint8_t v_er_2365_; lean_object* v___x_2368_; 
v___x_2368_ = lean_apply_1(v_oracle_2344_, v_obs_2358_);
if (lean_obj_tag(v___x_2368_) == 0)
{
lean_object* v_a_2369_; uint8_t v___x_2370_; 
lean_dec(v_criteria_2345_);
v_a_2369_ = lean_ctor_get(v___x_2368_, 0);
lean_inc(v_a_2369_);
lean_dec_ref_known(v___x_2368_, 1);
v___x_2370_ = lean_unbox(v_a_2369_);
lean_dec(v_a_2369_);
v_er_2365_ = v___x_2370_;
goto v___jp_2364_;
}
else
{
lean_object* v_a_2371_; lean_object* v___x_2372_; lean_object* v___x_2373_; 
v_a_2371_ = lean_ctor_get(v___x_2368_, 0);
lean_inc(v_a_2371_);
lean_dec_ref_known(v___x_2368_, 1);
v___x_2372_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_evalTail_spec__2(v_criteria_2345_, v___x_2359_);
v___x_2373_ = lp_algalVerification_Algal_Source_normalizeDecision(v_a_2371_, v___x_2372_);
lean_dec(v_a_2371_);
if (lean_obj_tag(v___x_2373_) == 0)
{
uint8_t v___x_2374_; 
lean_dec_ref_known(v___x_2373_, 1);
v___x_2374_ = 1;
v_er_2365_ = v___x_2374_;
goto v___jp_2364_;
}
else
{
lean_object* v_a_2375_; lean_object* v___f_2376_; lean_object* v___x_2377_; lean_object* v___x_2378_; 
v_a_2375_ = lean_ctor_get(v___x_2373_, 0);
lean_inc(v_a_2375_);
lean_dec_ref_known(v___x_2373_, 1);
v___f_2376_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__0), 2, 1);
lean_closure_set(v___f_2376_, 0, v_a_2375_);
v___x_2377_ = lp_algalVerification_Algal_Source_step(v_budgets_2346_, v_s_2363_);
v___x_2378_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2377_, v___f_2376_);
return v___x_2378_;
}
}
v___jp_2364_:
{
lean_object* v___x_2366_; lean_object* v___x_2367_; 
v___x_2366_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v___x_2366_, 0, v_er_2365_);
v___x_2367_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2367_, 0, v___x_2366_);
lean_ctor_set(v___x_2367_, 1, v_s_2363_);
return v___x_2367_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__1___boxed(lean_object* v_site_2381_, lean_object* v_question_2382_, lean_object* v_c_2383_, lean_object* v_oracle_2384_, lean_object* v_criteria_2385_, lean_object* v_budgets_2386_, lean_object* v_s_2387_){
_start:
{
lean_object* v_res_2388_; 
v_res_2388_ = lp_algalVerification_Algal_Source_evalTail___lam__1(v_site_2381_, v_question_2382_, v_c_2383_, v_oracle_2384_, v_criteria_2385_, v_budgets_2386_, v_s_2387_);
lean_dec_ref(v_budgets_2386_);
return v_res_2388_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__4(lean_object* v_budgets_2389_, lean_object* v___f_2390_, lean_object* v_s_2391_){
_start:
{
lean_object* v___x_2392_; lean_object* v___x_2393_; 
v___x_2392_ = lp_algalVerification_Algal_Source_charge(v_budgets_2389_, v_s_2391_);
v___x_2393_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2392_, v___f_2390_);
return v___x_2393_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__4___boxed(lean_object* v_budgets_2394_, lean_object* v___f_2395_, lean_object* v_s_2396_){
_start:
{
lean_object* v_res_2397_; 
v_res_2397_ = lp_algalVerification_Algal_Source_evalTail___lam__4(v_budgets_2394_, v___f_2395_, v_s_2396_);
lean_dec_ref(v_budgets_2394_);
return v_res_2397_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__5(lean_object* v_site_2398_, lean_object* v_question_2399_, lean_object* v_oracle_2400_, lean_object* v_criteria_2401_, lean_object* v_budgets_2402_, lean_object* v_c_2403_, lean_object* v_s_2404_){
_start:
{
lean_object* v___f_2405_; lean_object* v___f_2406_; lean_object* v___x_2407_; lean_object* v___x_2408_; 
lean_inc_ref_n(v_budgets_2402_, 2);
v___f_2405_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__1___boxed), 7, 6);
lean_closure_set(v___f_2405_, 0, v_site_2398_);
lean_closure_set(v___f_2405_, 1, v_question_2399_);
lean_closure_set(v___f_2405_, 2, v_c_2403_);
lean_closure_set(v___f_2405_, 3, v_oracle_2400_);
lean_closure_set(v___f_2405_, 4, v_criteria_2401_);
lean_closure_set(v___f_2405_, 5, v_budgets_2402_);
v___f_2406_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__4___boxed), 3, 2);
lean_closure_set(v___f_2406_, 0, v_budgets_2402_);
lean_closure_set(v___f_2406_, 1, v___f_2405_);
v___x_2407_ = lp_algalVerification_Algal_Source_step(v_budgets_2402_, v_s_2404_);
lean_dec_ref(v_budgets_2402_);
v___x_2408_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2407_, v___f_2406_);
return v___x_2408_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0(lean_object* v_value_2409_, lean_object* v_a_2410_, lean_object* v_a_2411_){
_start:
{
if (lean_obj_tag(v_a_2410_) == 0)
{
lean_object* v___x_2412_; 
lean_dec(v_a_2411_);
v___x_2412_ = lean_box(0);
return v___x_2412_;
}
else
{
lean_object* v_head_2413_; lean_object* v_tail_2414_; lean_object* v_fst_2415_; uint8_t v___x_2416_; 
v_head_2413_ = lean_ctor_get(v_a_2410_, 0);
v_tail_2414_ = lean_ctor_get(v_a_2410_, 1);
v_fst_2415_ = lean_ctor_get(v_head_2413_, 0);
v___x_2416_ = lean_string_dec_eq(v_fst_2415_, v_value_2409_);
if (v___x_2416_ == 0)
{
lean_object* v___x_2417_; lean_object* v___x_2418_; 
v___x_2417_ = lean_unsigned_to_nat(1u);
v___x_2418_ = lean_nat_add(v_a_2411_, v___x_2417_);
lean_dec(v_a_2411_);
v_a_2410_ = v_tail_2414_;
v_a_2411_ = v___x_2418_;
goto _start;
}
else
{
lean_object* v___x_2420_; 
v___x_2420_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2420_, 0, v_a_2411_);
return v___x_2420_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0___boxed(lean_object* v_value_2421_, lean_object* v_a_2422_, lean_object* v_a_2423_){
_start:
{
lean_object* v_res_2424_; 
v_res_2424_ = lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0(v_value_2421_, v_a_2422_, v_a_2423_);
lean_dec(v_a_2422_);
lean_dec_ref(v_value_2421_);
return v_res_2424_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__6(lean_object* v_site_2428_, lean_object* v_value_2429_, lean_object* v_c_2430_, lean_object* v_oracle_2431_, lean_object* v_s_2432_){
_start:
{
lean_object* v_steps_2433_; lean_object* v_calls_2434_; lean_object* v_obs_2435_; lean_object* v_invocations_2436_; lean_object* v___x_2438_; uint8_t v_isShared_2439_; uint8_t v_isSharedCheck_2464_; 
v_steps_2433_ = lean_ctor_get(v_s_2432_, 0);
v_calls_2434_ = lean_ctor_get(v_s_2432_, 1);
v_obs_2435_ = lean_ctor_get(v_s_2432_, 2);
v_invocations_2436_ = lean_ctor_get(v_s_2432_, 3);
v_isSharedCheck_2464_ = !lean_is_exclusive(v_s_2432_);
if (v_isSharedCheck_2464_ == 0)
{
v___x_2438_ = v_s_2432_;
v_isShared_2439_ = v_isSharedCheck_2464_;
goto v_resetjp_2437_;
}
else
{
lean_inc(v_invocations_2436_);
lean_inc(v_obs_2435_);
lean_inc(v_calls_2434_);
lean_inc(v_steps_2433_);
lean_dec(v_s_2432_);
v___x_2438_ = lean_box(0);
v_isShared_2439_ = v_isSharedCheck_2464_;
goto v_resetjp_2437_;
}
v_resetjp_2437_:
{
lean_object* v___x_2440_; lean_object* v_obs_2441_; lean_object* v___x_2442_; lean_object* v___x_2443_; lean_object* v___x_2444_; lean_object* v_s_2446_; 
v___x_2440_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__6___closed__0));
v_obs_2441_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_obs_2441_, 0, v_site_2428_);
lean_ctor_set(v_obs_2441_, 1, v___x_2440_);
lean_ctor_set(v_obs_2441_, 2, v_value_2429_);
lean_ctor_set(v_obs_2441_, 3, v_c_2430_);
v___x_2442_ = lean_box(0);
lean_inc_ref(v_obs_2441_);
v___x_2443_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_2443_, 0, v_obs_2441_);
lean_ctor_set(v___x_2443_, 1, v___x_2442_);
v___x_2444_ = l_List_appendTR___redArg(v_obs_2435_, v___x_2443_);
if (v_isShared_2439_ == 0)
{
lean_ctor_set(v___x_2438_, 2, v___x_2444_);
v_s_2446_ = v___x_2438_;
goto v_reusejp_2445_;
}
else
{
lean_object* v_reuseFailAlloc_2463_; 
v_reuseFailAlloc_2463_ = lean_alloc_ctor(0, 4, 0);
lean_ctor_set(v_reuseFailAlloc_2463_, 0, v_steps_2433_);
lean_ctor_set(v_reuseFailAlloc_2463_, 1, v_calls_2434_);
lean_ctor_set(v_reuseFailAlloc_2463_, 2, v___x_2444_);
lean_ctor_set(v_reuseFailAlloc_2463_, 3, v_invocations_2436_);
v_s_2446_ = v_reuseFailAlloc_2463_;
goto v_reusejp_2445_;
}
v_reusejp_2445_:
{
lean_object* v___x_2447_; 
v___x_2447_ = lean_apply_1(v_oracle_2431_, v_obs_2441_);
if (lean_obj_tag(v___x_2447_) == 0)
{
lean_object* v_a_2448_; lean_object* v___x_2449_; uint8_t v___x_2450_; lean_object* v___x_2451_; 
v_a_2448_ = lean_ctor_get(v___x_2447_, 0);
lean_inc(v_a_2448_);
lean_dec_ref_known(v___x_2447_, 1);
v___x_2449_ = lean_alloc_ctor(2, 0, 1);
v___x_2450_ = lean_unbox(v_a_2448_);
lean_dec(v_a_2448_);
lean_ctor_set_uint8(v___x_2449_, 0, v___x_2450_);
v___x_2451_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2451_, 0, v___x_2449_);
lean_ctor_set(v___x_2451_, 1, v_s_2446_);
return v___x_2451_;
}
else
{
lean_object* v_a_2452_; lean_object* v___x_2454_; uint8_t v_isShared_2455_; uint8_t v_isSharedCheck_2462_; 
v_a_2452_ = lean_ctor_get(v___x_2447_, 0);
v_isSharedCheck_2462_ = !lean_is_exclusive(v___x_2447_);
if (v_isSharedCheck_2462_ == 0)
{
v___x_2454_ = v___x_2447_;
v_isShared_2455_ = v_isSharedCheck_2462_;
goto v_resetjp_2453_;
}
else
{
lean_inc(v_a_2452_);
lean_dec(v___x_2447_);
v___x_2454_ = lean_box(0);
v_isShared_2455_ = v_isSharedCheck_2462_;
goto v_resetjp_2453_;
}
v_resetjp_2453_:
{
if (lean_obj_tag(v_a_2452_) == 3)
{
lean_object* v___x_2457_; 
if (v_isShared_2455_ == 0)
{
lean_ctor_set_tag(v___x_2454_, 0);
v___x_2457_ = v___x_2454_;
goto v_reusejp_2456_;
}
else
{
lean_object* v_reuseFailAlloc_2459_; 
v_reuseFailAlloc_2459_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_2459_, 0, v_a_2452_);
v___x_2457_ = v_reuseFailAlloc_2459_;
goto v_reusejp_2456_;
}
v_reusejp_2456_:
{
lean_object* v___x_2458_; 
v___x_2458_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2458_, 0, v___x_2457_);
lean_ctor_set(v___x_2458_, 1, v_s_2446_);
return v___x_2458_;
}
}
else
{
lean_object* v___x_2460_; lean_object* v___x_2461_; 
lean_del_object(v___x_2454_);
lean_dec(v_a_2452_);
v___x_2460_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__6___closed__1));
v___x_2461_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2461_, 0, v___x_2460_);
lean_ctor_set(v___x_2461_, 1, v_s_2446_);
return v___x_2461_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__7(lean_object* v_i_2465_, lean_object* v_site_2466_, lean_object* v_c_2467_, lean_object* v_oracle_2468_, lean_object* v_budgets_2469_, lean_object* v_s_2470_){
_start:
{
if (lean_obj_tag(v_i_2465_) == 3)
{
lean_object* v_value_2471_; lean_object* v___f_2472_; lean_object* v___x_2473_; lean_object* v___x_2474_; 
v_value_2471_ = lean_ctor_get(v_i_2465_, 0);
lean_inc_ref(v_value_2471_);
lean_dec_ref_known(v_i_2465_, 1);
v___f_2472_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__6), 5, 4);
lean_closure_set(v___f_2472_, 0, v_site_2466_);
lean_closure_set(v___f_2472_, 1, v_value_2471_);
lean_closure_set(v___f_2472_, 2, v_c_2467_);
lean_closure_set(v___f_2472_, 3, v_oracle_2468_);
v___x_2473_ = lp_algalVerification_Algal_Source_charge(v_budgets_2469_, v_s_2470_);
v___x_2474_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2473_, v___f_2472_);
return v___x_2474_;
}
else
{
lean_object* v___x_2475_; lean_object* v___x_2476_; 
lean_dec_ref(v_oracle_2468_);
lean_dec(v_c_2467_);
lean_dec_ref(v_site_2466_);
lean_dec(v_i_2465_);
v___x_2475_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
v___x_2476_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2476_, 0, v___x_2475_);
lean_ctor_set(v___x_2476_, 1, v_s_2470_);
return v___x_2476_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__7___boxed(lean_object* v_i_2477_, lean_object* v_site_2478_, lean_object* v_c_2479_, lean_object* v_oracle_2480_, lean_object* v_budgets_2481_, lean_object* v_s_2482_){
_start:
{
lean_object* v_res_2483_; 
v_res_2483_ = lp_algalVerification_Algal_Source_evalTail___lam__7(v_i_2477_, v_site_2478_, v_c_2479_, v_oracle_2480_, v_budgets_2481_, v_s_2482_);
lean_dec_ref(v_budgets_2481_);
return v_res_2483_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__8(lean_object* v_i_2484_, lean_object* v_site_2485_, lean_object* v_oracle_2486_, lean_object* v_budgets_2487_, lean_object* v_c_2488_, lean_object* v_s_2489_){
_start:
{
lean_object* v___f_2490_; lean_object* v___x_2491_; lean_object* v___x_2492_; 
lean_inc_ref(v_budgets_2487_);
v___f_2490_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__7___boxed), 6, 5);
lean_closure_set(v___f_2490_, 0, v_i_2484_);
lean_closure_set(v___f_2490_, 1, v_site_2485_);
lean_closure_set(v___f_2490_, 2, v_c_2488_);
lean_closure_set(v___f_2490_, 3, v_oracle_2486_);
lean_closure_set(v___f_2490_, 4, v_budgets_2487_);
v___x_2491_ = lp_algalVerification_Algal_Source_step(v_budgets_2487_, v_s_2489_);
lean_dec_ref(v_budgets_2487_);
v___x_2492_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2491_, v___f_2490_);
return v___x_2492_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__9(lean_object* v_site_2493_, lean_object* v_oracle_2494_, lean_object* v_budgets_2495_, lean_object* v_context_2496_, lean_object* v_env_2497_, lean_object* v_i_2498_, lean_object* v_s_2499_){
_start:
{
lean_object* v___f_2500_; lean_object* v___x_2501_; lean_object* v___x_2502_; 
lean_inc_ref(v_budgets_2495_);
v___f_2500_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__8), 6, 4);
lean_closure_set(v___f_2500_, 0, v_i_2498_);
lean_closure_set(v___f_2500_, 1, v_site_2493_);
lean_closure_set(v___f_2500_, 2, v_oracle_2494_);
lean_closure_set(v___f_2500_, 3, v_budgets_2495_);
v___x_2501_ = lp_algalVerification_Algal_Source_evalOperand(v_budgets_2495_, v_context_2496_, v_env_2497_, v_s_2499_);
lean_dec_ref(v_budgets_2495_);
v___x_2502_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2501_, v___f_2500_);
return v___x_2502_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__9___boxed(lean_object* v_site_2503_, lean_object* v_oracle_2504_, lean_object* v_budgets_2505_, lean_object* v_context_2506_, lean_object* v_env_2507_, lean_object* v_i_2508_, lean_object* v_s_2509_){
_start:
{
lean_object* v_res_2510_; 
v_res_2510_ = lp_algalVerification_Algal_Source_evalTail___lam__9(v_site_2503_, v_oracle_2504_, v_budgets_2505_, v_context_2506_, v_env_2507_, v_i_2508_, v_s_2509_);
lean_dec(v_env_2507_);
return v_res_2510_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__2___boxed(lean_object* v_site_2512_, lean_object* v_budgets_2513_, lean_object* v_oracle_2514_, lean_object* v_child_2515_, lean_object* v_n_2516_, lean_object* v_mod_2517_, lean_object* v_env_2518_, lean_object* v_depth_2519_, lean_object* v___f_2520_, lean_object* v_no_2521_, lean_object* v_yes_2522_, lean_object* v_v_2523_, lean_object* v_s_2524_){
_start:
{
lean_object* v_res_2525_; 
v_res_2525_ = lp_algalVerification_Algal_Source_evalTail___lam__2(v_site_2512_, v_budgets_2513_, v_oracle_2514_, v_child_2515_, v_n_2516_, v_mod_2517_, v_env_2518_, v_depth_2519_, v___f_2520_, v_no_2521_, v_yes_2522_, v_v_2523_, v_s_2524_);
lean_dec(v_v_2523_);
lean_dec(v_n_2516_);
return v_res_2525_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__3(lean_object* v_arms_2526_, lean_object* v_site_2527_, lean_object* v_budgets_2528_, lean_object* v_oracle_2529_, lean_object* v_child_2530_, lean_object* v_n_2531_, lean_object* v_mod_2532_, lean_object* v_env_2533_, lean_object* v_depth_2534_, lean_object* v___f_2535_, lean_object* v_dv_2536_, lean_object* v_s_2537_){
_start:
{
if (lean_obj_tag(v_dv_2536_) == 3)
{
lean_object* v_value_2541_; lean_object* v___x_2542_; lean_object* v___x_2543_; 
v_value_2541_ = lean_ctor_get(v_dv_2536_, 0);
v___x_2542_ = lean_unsigned_to_nat(0u);
v___x_2543_ = lp_algalVerification_List_findIdx_x3f_go___at___00Algal_Source_evalTail_spec__0(v_value_2541_, v_arms_2526_, v___x_2542_);
if (lean_obj_tag(v___x_2543_) == 0)
{
lean_dec_ref(v___f_2535_);
lean_dec(v_depth_2534_);
lean_dec(v_env_2533_);
lean_dec_ref(v_mod_2532_);
lean_dec_ref(v_child_2530_);
lean_dec_ref(v_oracle_2529_);
lean_dec_ref(v_budgets_2528_);
lean_dec_ref(v_site_2527_);
goto v___jp_2538_;
}
else
{
lean_object* v_val_2544_; lean_object* v___x_2545_; 
v_val_2544_ = lean_ctor_get(v___x_2543_, 0);
lean_inc_n(v_val_2544_, 2);
lean_dec_ref_known(v___x_2543_, 1);
v___x_2545_ = l_List_get_x3fInternal___redArg(v_arms_2526_, v_val_2544_);
if (lean_obj_tag(v___x_2545_) == 0)
{
lean_dec(v_val_2544_);
lean_dec_ref(v___f_2535_);
lean_dec(v_depth_2534_);
lean_dec(v_env_2533_);
lean_dec_ref(v_mod_2532_);
lean_dec_ref(v_child_2530_);
lean_dec_ref(v_oracle_2529_);
lean_dec_ref(v_budgets_2528_);
lean_dec_ref(v_site_2527_);
goto v___jp_2538_;
}
else
{
lean_object* v_val_2546_; lean_object* v_snd_2547_; lean_object* v___x_2548_; lean_object* v___x_2549_; lean_object* v___x_2550_; lean_object* v___x_2551_; lean_object* v___x_2552_; lean_object* v___x_2553_; lean_object* v___x_2554_; lean_object* v___x_2555_; 
v_val_2546_ = lean_ctor_get(v___x_2545_, 0);
lean_inc(v_val_2546_);
lean_dec_ref_known(v___x_2545_, 1);
v_snd_2547_ = lean_ctor_get(v_val_2546_, 1);
lean_inc(v_snd_2547_);
lean_dec(v_val_2546_);
v___x_2548_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__2___closed__0));
v___x_2549_ = lean_string_append(v_site_2527_, v___x_2548_);
v___x_2550_ = lean_unsigned_to_nat(1u);
v___x_2551_ = lean_nat_add(v_val_2544_, v___x_2550_);
lean_dec(v_val_2544_);
v___x_2552_ = l_Nat_reprFast(v___x_2551_);
v___x_2553_ = lean_string_append(v___x_2549_, v___x_2552_);
lean_dec_ref(v___x_2552_);
v___x_2554_ = lp_algalVerification_Algal_Source_evalTail(v_budgets_2528_, v_oracle_2529_, v_child_2530_, v_n_2531_, v_mod_2532_, v_env_2533_, v___x_2553_, v_depth_2534_, v_snd_2547_, v_s_2537_);
v___x_2555_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2554_, v___f_2535_);
return v___x_2555_;
}
}
}
else
{
lean_object* v___x_2556_; lean_object* v___x_2557_; 
lean_dec_ref(v___f_2535_);
lean_dec(v_depth_2534_);
lean_dec(v_env_2533_);
lean_dec_ref(v_mod_2532_);
lean_dec_ref(v_child_2530_);
lean_dec_ref(v_oracle_2529_);
lean_dec_ref(v_budgets_2528_);
lean_dec_ref(v_site_2527_);
v___x_2556_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
v___x_2557_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2557_, 0, v___x_2556_);
lean_ctor_set(v___x_2557_, 1, v_s_2537_);
return v___x_2557_;
}
v___jp_2538_:
{
lean_object* v___x_2539_; lean_object* v___x_2540_; 
v___x_2539_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
v___x_2540_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2540_, 0, v___x_2539_);
lean_ctor_set(v___x_2540_, 1, v_s_2537_);
return v___x_2540_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__3___boxed(lean_object* v_arms_2558_, lean_object* v_site_2559_, lean_object* v_budgets_2560_, lean_object* v_oracle_2561_, lean_object* v_child_2562_, lean_object* v_n_2563_, lean_object* v_mod_2564_, lean_object* v_env_2565_, lean_object* v_depth_2566_, lean_object* v___f_2567_, lean_object* v_dv_2568_, lean_object* v_s_2569_){
_start:
{
lean_object* v_res_2570_; 
v_res_2570_ = lp_algalVerification_Algal_Source_evalTail___lam__3(v_arms_2558_, v_site_2559_, v_budgets_2560_, v_oracle_2561_, v_child_2562_, v_n_2563_, v_mod_2564_, v_env_2565_, v_depth_2566_, v___f_2567_, v_dv_2568_, v_s_2569_);
lean_dec(v_dv_2568_);
lean_dec(v_n_2563_);
lean_dec(v_arms_2558_);
return v_res_2570_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail(lean_object* v_budgets_2571_, lean_object* v_oracle_2572_, lean_object* v_child_2573_, lean_object* v_fuel_2574_, lean_object* v_mod_2575_, lean_object* v_env_2576_, lean_object* v_site_2577_, lean_object* v_depth_2578_, lean_object* v_e_2579_, lean_object* v_s_2580_){
_start:
{
lean_object* v_zero_2581_; uint8_t v_isZero_2582_; 
v_zero_2581_ = lean_unsigned_to_nat(0u);
v_isZero_2582_ = lean_nat_dec_eq(v_fuel_2574_, v_zero_2581_);
if (v_isZero_2582_ == 1)
{
lean_object* v___x_2583_; lean_object* v___x_2584_; 
lean_dec_ref(v_e_2579_);
lean_dec(v_depth_2578_);
lean_dec_ref(v_site_2577_);
lean_dec(v_env_2576_);
lean_dec_ref(v_mod_2575_);
lean_dec_ref(v_child_2573_);
lean_dec_ref(v_oracle_2572_);
lean_dec_ref(v_budgets_2571_);
v___x_2583_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2584_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2584_, 0, v___x_2583_);
lean_ctor_set(v___x_2584_, 1, v_s_2580_);
return v___x_2584_;
}
else
{
lean_object* v_one_2585_; lean_object* v_n_2586_; 
v_one_2585_ = lean_unsigned_to_nat(1u);
v_n_2586_ = lean_nat_sub(v_fuel_2574_, v_one_2585_);
switch(lean_obj_tag(v_e_2579_))
{
case 8:
{
lean_object* v_condition_2587_; lean_object* v_yes_2588_; lean_object* v_no_2589_; lean_object* v___f_2590_; lean_object* v___f_2591_; uint8_t v___y_2593_; uint8_t v___x_2597_; 
v_condition_2587_ = lean_ctor_get(v_e_2579_, 0);
v_yes_2588_ = lean_ctor_get(v_e_2579_, 1);
v_no_2589_ = lean_ctor_get(v_e_2579_, 2);
lean_inc_ref_n(v_budgets_2571_, 2);
v___f_2590_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__1___boxed), 3, 1);
lean_closure_set(v___f_2590_, 0, v_budgets_2571_);
lean_inc_ref(v_yes_2588_);
lean_inc_ref(v_no_2589_);
lean_inc(v_env_2576_);
v___f_2591_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__2___boxed), 13, 11);
lean_closure_set(v___f_2591_, 0, v_site_2577_);
lean_closure_set(v___f_2591_, 1, v_budgets_2571_);
lean_closure_set(v___f_2591_, 2, v_oracle_2572_);
lean_closure_set(v___f_2591_, 3, v_child_2573_);
lean_closure_set(v___f_2591_, 4, v_n_2586_);
lean_closure_set(v___f_2591_, 5, v_mod_2575_);
lean_closure_set(v___f_2591_, 6, v_env_2576_);
lean_closure_set(v___f_2591_, 7, v_depth_2578_);
lean_closure_set(v___f_2591_, 8, v___f_2590_);
lean_closure_set(v___f_2591_, 9, v_no_2589_);
lean_closure_set(v___f_2591_, 10, v_yes_2588_);
v___x_2597_ = lp_algalVerification_Algal_Source_hasEffect(v_yes_2588_);
if (v___x_2597_ == 0)
{
uint8_t v___x_2598_; 
v___x_2598_ = lp_algalVerification_Algal_Source_hasEffect(v_no_2589_);
v___y_2593_ = v___x_2598_;
goto v___jp_2592_;
}
else
{
v___y_2593_ = v___x_2597_;
goto v___jp_2592_;
}
v___jp_2592_:
{
if (v___y_2593_ == 0)
{
lean_object* v___x_2594_; 
lean_dec_ref(v___f_2591_);
v___x_2594_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2571_, v_e_2579_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
return v___x_2594_;
}
else
{
lean_object* v___x_2595_; lean_object* v___x_2596_; 
lean_inc_ref(v_condition_2587_);
lean_dec_ref_known(v_e_2579_, 3);
v___x_2595_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2571_, v_condition_2587_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
v___x_2596_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2595_, v___f_2591_);
return v___x_2596_;
}
}
}
case 9:
{
lean_object* v_value_2599_; lean_object* v_arms_2600_; uint8_t v___x_2601_; 
v_value_2599_ = lean_ctor_get(v_e_2579_, 0);
v_arms_2600_ = lean_ctor_get(v_e_2579_, 1);
v___x_2601_ = lp_algalVerification_List_any___at___00Algal_Source_evalTail_spec__1(v_arms_2600_);
if (v___x_2601_ == 0)
{
lean_object* v___x_2602_; 
lean_dec(v_n_2586_);
lean_dec(v_depth_2578_);
lean_dec_ref(v_site_2577_);
lean_dec_ref(v_mod_2575_);
lean_dec_ref(v_child_2573_);
lean_dec_ref(v_oracle_2572_);
v___x_2602_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2571_, v_e_2579_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
return v___x_2602_;
}
else
{
lean_object* v___f_2603_; lean_object* v___f_2604_; lean_object* v___x_2605_; lean_object* v___x_2606_; 
lean_inc(v_arms_2600_);
lean_inc_ref(v_value_2599_);
lean_dec_ref_known(v_e_2579_, 2);
lean_inc_ref_n(v_budgets_2571_, 2);
v___f_2603_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalEach___redArg___lam__1___boxed), 3, 1);
lean_closure_set(v___f_2603_, 0, v_budgets_2571_);
lean_inc(v_env_2576_);
v___f_2604_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__3___boxed), 12, 10);
lean_closure_set(v___f_2604_, 0, v_arms_2600_);
lean_closure_set(v___f_2604_, 1, v_site_2577_);
lean_closure_set(v___f_2604_, 2, v_budgets_2571_);
lean_closure_set(v___f_2604_, 3, v_oracle_2572_);
lean_closure_set(v___f_2604_, 4, v_child_2573_);
lean_closure_set(v___f_2604_, 5, v_n_2586_);
lean_closure_set(v___f_2604_, 6, v_mod_2575_);
lean_closure_set(v___f_2604_, 7, v_env_2576_);
lean_closure_set(v___f_2604_, 8, v_depth_2578_);
lean_closure_set(v___f_2604_, 9, v___f_2603_);
v___x_2605_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2571_, v_value_2599_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
v___x_2606_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2605_, v___f_2604_);
return v___x_2606_;
}
}
case 10:
{
lean_object* v_question_2607_; lean_object* v_context_2608_; lean_object* v_criteria_2609_; lean_object* v___f_2610_; lean_object* v___x_2611_; lean_object* v___x_2612_; 
lean_dec(v_n_2586_);
lean_dec(v_depth_2578_);
lean_dec_ref(v_mod_2575_);
lean_dec_ref(v_child_2573_);
v_question_2607_ = lean_ctor_get(v_e_2579_, 0);
lean_inc_ref(v_question_2607_);
v_context_2608_ = lean_ctor_get(v_e_2579_, 1);
lean_inc_ref(v_context_2608_);
v_criteria_2609_ = lean_ctor_get(v_e_2579_, 2);
lean_inc(v_criteria_2609_);
lean_dec_ref_known(v_e_2579_, 3);
lean_inc_ref(v_budgets_2571_);
v___f_2610_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__5), 7, 5);
lean_closure_set(v___f_2610_, 0, v_site_2577_);
lean_closure_set(v___f_2610_, 1, v_question_2607_);
lean_closure_set(v___f_2610_, 2, v_oracle_2572_);
lean_closure_set(v___f_2610_, 3, v_criteria_2609_);
lean_closure_set(v___f_2610_, 4, v_budgets_2571_);
v___x_2611_ = lp_algalVerification_Algal_Source_evalOperand(v_budgets_2571_, v_context_2608_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
v___x_2612_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2611_, v___f_2610_);
return v___x_2612_;
}
case 11:
{
lean_object* v_instruction_2613_; lean_object* v_context_2614_; lean_object* v___f_2615_; lean_object* v___x_2616_; lean_object* v___x_2617_; 
lean_dec(v_n_2586_);
lean_dec(v_depth_2578_);
lean_dec_ref(v_mod_2575_);
lean_dec_ref(v_child_2573_);
v_instruction_2613_ = lean_ctor_get(v_e_2579_, 0);
lean_inc_ref(v_instruction_2613_);
v_context_2614_ = lean_ctor_get(v_e_2579_, 1);
lean_inc_ref(v_context_2614_);
lean_dec_ref_known(v_e_2579_, 2);
lean_inc(v_env_2576_);
lean_inc_ref(v_budgets_2571_);
v___f_2615_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_evalTail___lam__9___boxed), 7, 5);
lean_closure_set(v___f_2615_, 0, v_site_2577_);
lean_closure_set(v___f_2615_, 1, v_oracle_2572_);
lean_closure_set(v___f_2615_, 2, v_budgets_2571_);
lean_closure_set(v___f_2615_, 3, v_context_2614_);
lean_closure_set(v___f_2615_, 4, v_env_2576_);
v___x_2616_ = lp_algalVerification_Algal_Source_evalOperand(v_budgets_2571_, v_instruction_2613_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
v___x_2617_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2616_, v___f_2615_);
return v___x_2617_;
}
case 12:
{
lean_object* v_alias_2618_; lean_object* v_args_2619_; lean_object* v___x_2620_; 
lean_dec_ref(v_oracle_2572_);
v_alias_2618_ = lean_ctor_get(v_e_2579_, 0);
lean_inc_ref(v_alias_2618_);
v_args_2619_ = lean_ctor_get(v_e_2579_, 1);
lean_inc(v_args_2619_);
lean_dec_ref_known(v_e_2579_, 2);
v___x_2620_ = lp_algalVerification_Algal_Source_evalCall___redArg(v_budgets_2571_, v_child_2573_, v_n_2586_, v_mod_2575_, v_env_2576_, v_site_2577_, v_depth_2578_, v_alias_2618_, v_args_2619_, v_s_2580_);
lean_dec(v_args_2619_);
lean_dec_ref(v_alias_2618_);
lean_dec(v_env_2576_);
lean_dec_ref(v_mod_2575_);
lean_dec(v_n_2586_);
return v___x_2620_;
}
case 13:
{
lean_object* v_alias_2621_; lean_object* v_over_2622_; lean_object* v_items_2623_; lean_object* v_args_2624_; lean_object* v_maxItems_2625_; lean_object* v___x_2626_; 
lean_dec_ref(v_oracle_2572_);
v_alias_2621_ = lean_ctor_get(v_e_2579_, 0);
lean_inc_ref(v_alias_2621_);
v_over_2622_ = lean_ctor_get(v_e_2579_, 1);
lean_inc_ref(v_over_2622_);
v_items_2623_ = lean_ctor_get(v_e_2579_, 2);
lean_inc_ref(v_items_2623_);
v_args_2624_ = lean_ctor_get(v_e_2579_, 3);
lean_inc(v_args_2624_);
v_maxItems_2625_ = lean_ctor_get(v_e_2579_, 4);
lean_inc(v_maxItems_2625_);
lean_dec_ref_known(v_e_2579_, 5);
v___x_2626_ = lp_algalVerification_Algal_Source_evalEach___redArg(v_budgets_2571_, v_child_2573_, v_n_2586_, v_mod_2575_, v_env_2576_, v_site_2577_, v_depth_2578_, v_alias_2621_, v_over_2622_, v_items_2623_, v_args_2624_, v_maxItems_2625_, v_s_2580_);
lean_dec_ref(v_alias_2621_);
lean_dec_ref(v_mod_2575_);
lean_dec(v_n_2586_);
return v___x_2626_;
}
default: 
{
lean_object* v___x_2627_; 
lean_dec(v_n_2586_);
lean_dec(v_depth_2578_);
lean_dec_ref(v_site_2577_);
lean_dec_ref(v_mod_2575_);
lean_dec_ref(v_child_2573_);
lean_dec_ref(v_oracle_2572_);
v___x_2627_ = lp_algalVerification_Algal_Source_evalCell(v_budgets_2571_, v_e_2579_, v_env_2576_, v_s_2580_);
lean_dec(v_env_2576_);
lean_dec_ref(v_budgets_2571_);
return v___x_2627_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___lam__2(lean_object* v_site_2628_, lean_object* v_budgets_2629_, lean_object* v_oracle_2630_, lean_object* v_child_2631_, lean_object* v_n_2632_, lean_object* v_mod_2633_, lean_object* v_env_2634_, lean_object* v_depth_2635_, lean_object* v___f_2636_, lean_object* v_no_2637_, lean_object* v_yes_2638_, lean_object* v_v_2639_, lean_object* v_s_2640_){
_start:
{
lean_object* v___y_2642_; lean_object* v___y_2643_; lean_object* v___x_2650_; 
v___x_2650_ = lp_algalVerification_Algal_Source_truthy(v_v_2639_);
if (lean_obj_tag(v___x_2650_) == 0)
{
lean_object* v___x_2651_; lean_object* v___x_2652_; 
lean_dec_ref_known(v___x_2650_, 1);
lean_dec_ref(v_yes_2638_);
lean_dec_ref(v_no_2637_);
lean_dec_ref(v___f_2636_);
lean_dec(v_depth_2635_);
lean_dec(v_env_2634_);
lean_dec_ref(v_mod_2633_);
lean_dec_ref(v_child_2631_);
lean_dec_ref(v_oracle_2630_);
lean_dec_ref(v_budgets_2629_);
lean_dec_ref(v_site_2628_);
v___x_2651_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalExpr___closed__0));
v___x_2652_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2652_, 0, v___x_2651_);
lean_ctor_set(v___x_2652_, 1, v_s_2640_);
return v___x_2652_;
}
else
{
lean_object* v_a_2653_; lean_object* v___y_2655_; uint8_t v___x_2657_; 
v_a_2653_ = lean_ctor_get(v___x_2650_, 0);
lean_inc(v_a_2653_);
lean_dec_ref_known(v___x_2650_, 1);
v___x_2657_ = lean_unbox(v_a_2653_);
if (v___x_2657_ == 0)
{
lean_object* v___x_2658_; 
v___x_2658_ = lean_unsigned_to_nat(2u);
v___y_2655_ = v___x_2658_;
goto v___jp_2654_;
}
else
{
lean_object* v___x_2659_; 
v___x_2659_ = lean_unsigned_to_nat(1u);
v___y_2655_ = v___x_2659_;
goto v___jp_2654_;
}
v___jp_2654_:
{
uint8_t v___x_2656_; 
v___x_2656_ = lean_unbox(v_a_2653_);
lean_dec(v_a_2653_);
if (v___x_2656_ == 0)
{
lean_dec_ref(v_yes_2638_);
v___y_2642_ = v___y_2655_;
v___y_2643_ = v_no_2637_;
goto v___jp_2641_;
}
else
{
lean_dec_ref(v_no_2637_);
v___y_2642_ = v___y_2655_;
v___y_2643_ = v_yes_2638_;
goto v___jp_2641_;
}
}
}
v___jp_2641_:
{
lean_object* v___x_2644_; lean_object* v___x_2645_; lean_object* v___x_2646_; lean_object* v___x_2647_; lean_object* v___x_2648_; lean_object* v___x_2649_; 
v___x_2644_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalTail___lam__2___closed__0));
v___x_2645_ = lean_string_append(v_site_2628_, v___x_2644_);
v___x_2646_ = l_Nat_reprFast(v___y_2642_);
v___x_2647_ = lean_string_append(v___x_2645_, v___x_2646_);
lean_dec_ref(v___x_2646_);
v___x_2648_ = lp_algalVerification_Algal_Source_evalTail(v_budgets_2629_, v_oracle_2630_, v_child_2631_, v_n_2632_, v_mod_2633_, v_env_2634_, v___x_2647_, v_depth_2635_, v___y_2643_, v_s_2640_);
v___x_2649_ = lp_algalVerification_Algal_Source_seqR___redArg(v___x_2648_, v___f_2636_);
return v___x_2649_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalTail___boxed(lean_object* v_budgets_2660_, lean_object* v_oracle_2661_, lean_object* v_child_2662_, lean_object* v_fuel_2663_, lean_object* v_mod_2664_, lean_object* v_env_2665_, lean_object* v_site_2666_, lean_object* v_depth_2667_, lean_object* v_e_2668_, lean_object* v_s_2669_){
_start:
{
lean_object* v_res_2670_; 
v_res_2670_ = lp_algalVerification_Algal_Source_evalTail(v_budgets_2660_, v_oracle_2661_, v_child_2662_, v_fuel_2663_, v_mod_2664_, v_env_2665_, v_site_2666_, v_depth_2667_, v_e_2668_, v_s_2669_);
lean_dec(v_fuel_2663_);
return v_res_2670_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_evalBinds(lean_object* v_budgets_2673_, lean_object* v_oracle_2674_, lean_object* v_child_2675_, lean_object* v_fuel_2676_, lean_object* v_m_2677_, lean_object* v_env_2678_, lean_object* v_depth_2679_, lean_object* v_bs_2680_, lean_object* v_i_2681_, lean_object* v_s_2682_){
_start:
{
lean_object* v_zero_2683_; uint8_t v_isZero_2684_; 
v_zero_2683_ = lean_unsigned_to_nat(0u);
v_isZero_2684_ = lean_nat_dec_eq(v_fuel_2676_, v_zero_2683_);
if (v_isZero_2684_ == 1)
{
lean_object* v___x_2685_; lean_object* v___x_2686_; 
lean_dec(v_i_2681_);
lean_dec(v_bs_2680_);
lean_dec(v_depth_2679_);
lean_dec(v_env_2678_);
lean_dec_ref(v_m_2677_);
lean_dec(v_fuel_2676_);
lean_dec_ref(v_child_2675_);
lean_dec_ref(v_oracle_2674_);
lean_dec_ref(v_budgets_2673_);
v___x_2685_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArgs___closed__0));
v___x_2686_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2686_, 0, v___x_2685_);
lean_ctor_set(v___x_2686_, 1, v_s_2682_);
return v___x_2686_;
}
else
{
if (lean_obj_tag(v_bs_2680_) == 0)
{
lean_object* v___x_2687_; lean_object* v___x_2688_; 
lean_dec(v_i_2681_);
lean_dec(v_depth_2679_);
lean_dec_ref(v_m_2677_);
lean_dec(v_fuel_2676_);
lean_dec_ref(v_child_2675_);
lean_dec_ref(v_oracle_2674_);
lean_dec_ref(v_budgets_2673_);
v___x_2687_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_2687_, 0, v_env_2678_);
v___x_2688_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2688_, 0, v___x_2687_);
lean_ctor_set(v___x_2688_, 1, v_s_2682_);
return v___x_2688_;
}
else
{
lean_object* v_head_2689_; lean_object* v_tail_2690_; lean_object* v___x_2692_; uint8_t v_isShared_2693_; uint8_t v_isSharedCheck_2757_; 
v_head_2689_ = lean_ctor_get(v_bs_2680_, 0);
v_tail_2690_ = lean_ctor_get(v_bs_2680_, 1);
v_isSharedCheck_2757_ = !lean_is_exclusive(v_bs_2680_);
if (v_isSharedCheck_2757_ == 0)
{
v___x_2692_ = v_bs_2680_;
v_isShared_2693_ = v_isSharedCheck_2757_;
goto v_resetjp_2691_;
}
else
{
lean_inc(v_tail_2690_);
lean_inc(v_head_2689_);
lean_dec(v_bs_2680_);
v___x_2692_ = lean_box(0);
v_isShared_2693_ = v_isSharedCheck_2757_;
goto v_resetjp_2691_;
}
v_resetjp_2691_:
{
lean_object* v_fst_2694_; lean_object* v_snd_2695_; lean_object* v_one_2696_; lean_object* v_n_2697_; lean_object* v___x_2698_; lean_object* v___x_2699_; lean_object* v___x_2700_; lean_object* v___x_2701_; lean_object* v___x_2702_; lean_object* v___x_2703_; lean_object* v___x_2704_; lean_object* v___x_2705_; lean_object* v_fst_2706_; 
v_fst_2694_ = lean_ctor_get(v_head_2689_, 0);
lean_inc(v_fst_2694_);
v_snd_2695_ = lean_ctor_get(v_head_2689_, 1);
lean_inc(v_snd_2695_);
lean_dec(v_head_2689_);
v_one_2696_ = lean_unsigned_to_nat(1u);
v_n_2697_ = lean_nat_sub(v_fuel_2676_, v_one_2696_);
lean_dec(v_fuel_2676_);
v___x_2698_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalBinds___closed__0));
v___x_2699_ = lean_nat_add(v_i_2681_, v_one_2696_);
lean_dec(v_i_2681_);
lean_inc(v___x_2699_);
v___x_2700_ = l_Nat_reprFast(v___x_2699_);
v___x_2701_ = lean_string_append(v___x_2698_, v___x_2700_);
lean_dec_ref(v___x_2700_);
v___x_2702_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalBinds___closed__1));
v___x_2703_ = lean_string_append(v___x_2701_, v___x_2702_);
v___x_2704_ = lean_string_append(v___x_2703_, v_fst_2694_);
lean_inc(v_depth_2679_);
lean_inc(v_env_2678_);
lean_inc_ref(v_m_2677_);
lean_inc_ref(v_child_2675_);
lean_inc_ref(v_oracle_2674_);
lean_inc_ref(v_budgets_2673_);
v___x_2705_ = lp_algalVerification_Algal_Source_evalTail(v_budgets_2673_, v_oracle_2674_, v_child_2675_, v_n_2697_, v_m_2677_, v_env_2678_, v___x_2704_, v_depth_2679_, v_snd_2695_, v_s_2682_);
v_fst_2706_ = lean_ctor_get(v___x_2705_, 0);
lean_inc(v_fst_2706_);
switch(lean_obj_tag(v_fst_2706_))
{
case 0:
{
lean_object* v_snd_2707_; lean_object* v___x_2709_; uint8_t v_isShared_2710_; uint8_t v_isSharedCheck_2722_; 
v_snd_2707_ = lean_ctor_get(v___x_2705_, 1);
v_isSharedCheck_2722_ = !lean_is_exclusive(v___x_2705_);
if (v_isSharedCheck_2722_ == 0)
{
lean_object* v_unused_2723_; 
v_unused_2723_ = lean_ctor_get(v___x_2705_, 0);
lean_dec(v_unused_2723_);
v___x_2709_ = v___x_2705_;
v_isShared_2710_ = v_isSharedCheck_2722_;
goto v_resetjp_2708_;
}
else
{
lean_inc(v_snd_2707_);
lean_dec(v___x_2705_);
v___x_2709_ = lean_box(0);
v_isShared_2710_ = v_isSharedCheck_2722_;
goto v_resetjp_2708_;
}
v_resetjp_2708_:
{
lean_object* v_value_2711_; lean_object* v___x_2712_; lean_object* v___x_2714_; 
v_value_2711_ = lean_ctor_get(v_fst_2706_, 0);
lean_inc(v_value_2711_);
lean_dec_ref_known(v_fst_2706_, 1);
v___x_2712_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_2712_, 0, v_value_2711_);
if (v_isShared_2710_ == 0)
{
lean_ctor_set(v___x_2709_, 1, v___x_2712_);
lean_ctor_set(v___x_2709_, 0, v_fst_2694_);
v___x_2714_ = v___x_2709_;
goto v_reusejp_2713_;
}
else
{
lean_object* v_reuseFailAlloc_2721_; 
v_reuseFailAlloc_2721_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2721_, 0, v_fst_2694_);
lean_ctor_set(v_reuseFailAlloc_2721_, 1, v___x_2712_);
v___x_2714_ = v_reuseFailAlloc_2721_;
goto v_reusejp_2713_;
}
v_reusejp_2713_:
{
lean_object* v___x_2715_; lean_object* v___x_2717_; 
v___x_2715_ = lean_box(0);
if (v_isShared_2693_ == 0)
{
lean_ctor_set(v___x_2692_, 1, v___x_2715_);
lean_ctor_set(v___x_2692_, 0, v___x_2714_);
v___x_2717_ = v___x_2692_;
goto v_reusejp_2716_;
}
else
{
lean_object* v_reuseFailAlloc_2720_; 
v_reuseFailAlloc_2720_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2720_, 0, v___x_2714_);
lean_ctor_set(v_reuseFailAlloc_2720_, 1, v___x_2715_);
v___x_2717_ = v_reuseFailAlloc_2720_;
goto v_reusejp_2716_;
}
v_reusejp_2716_:
{
lean_object* v___x_2718_; 
v___x_2718_ = l_List_appendTR___redArg(v_env_2678_, v___x_2717_);
v_fuel_2676_ = v_n_2697_;
v_env_2678_ = v___x_2718_;
v_bs_2680_ = v_tail_2690_;
v_i_2681_ = v___x_2699_;
v_s_2682_ = v_snd_2707_;
goto _start;
}
}
}
}
case 1:
{
lean_object* v_snd_2724_; lean_object* v___x_2726_; uint8_t v_isShared_2727_; uint8_t v_isSharedCheck_2738_; 
v_snd_2724_ = lean_ctor_get(v___x_2705_, 1);
v_isSharedCheck_2738_ = !lean_is_exclusive(v___x_2705_);
if (v_isSharedCheck_2738_ == 0)
{
lean_object* v_unused_2739_; 
v_unused_2739_ = lean_ctor_get(v___x_2705_, 0);
lean_dec(v_unused_2739_);
v___x_2726_ = v___x_2705_;
v_isShared_2727_ = v_isSharedCheck_2738_;
goto v_resetjp_2725_;
}
else
{
lean_inc(v_snd_2724_);
lean_dec(v___x_2705_);
v___x_2726_ = lean_box(0);
v_isShared_2727_ = v_isSharedCheck_2738_;
goto v_resetjp_2725_;
}
v_resetjp_2725_:
{
lean_object* v___x_2728_; lean_object* v___x_2730_; 
v___x_2728_ = lean_box(0);
if (v_isShared_2727_ == 0)
{
lean_ctor_set(v___x_2726_, 1, v___x_2728_);
lean_ctor_set(v___x_2726_, 0, v_fst_2694_);
v___x_2730_ = v___x_2726_;
goto v_reusejp_2729_;
}
else
{
lean_object* v_reuseFailAlloc_2737_; 
v_reuseFailAlloc_2737_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2737_, 0, v_fst_2694_);
lean_ctor_set(v_reuseFailAlloc_2737_, 1, v___x_2728_);
v___x_2730_ = v_reuseFailAlloc_2737_;
goto v_reusejp_2729_;
}
v_reusejp_2729_:
{
lean_object* v___x_2731_; lean_object* v___x_2733_; 
v___x_2731_ = lean_box(0);
if (v_isShared_2693_ == 0)
{
lean_ctor_set(v___x_2692_, 1, v___x_2731_);
lean_ctor_set(v___x_2692_, 0, v___x_2730_);
v___x_2733_ = v___x_2692_;
goto v_reusejp_2732_;
}
else
{
lean_object* v_reuseFailAlloc_2736_; 
v_reuseFailAlloc_2736_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2736_, 0, v___x_2730_);
lean_ctor_set(v_reuseFailAlloc_2736_, 1, v___x_2731_);
v___x_2733_ = v_reuseFailAlloc_2736_;
goto v_reusejp_2732_;
}
v_reusejp_2732_:
{
lean_object* v___x_2734_; 
v___x_2734_ = l_List_appendTR___redArg(v_env_2678_, v___x_2733_);
v_fuel_2676_ = v_n_2697_;
v_env_2678_ = v___x_2734_;
v_bs_2680_ = v_tail_2690_;
v_i_2681_ = v___x_2699_;
v_s_2682_ = v_snd_2724_;
goto _start;
}
}
}
}
default: 
{
lean_object* v_snd_2740_; lean_object* v___x_2742_; uint8_t v_isShared_2743_; uint8_t v_isSharedCheck_2755_; 
lean_dec(v___x_2699_);
lean_dec(v_n_2697_);
lean_dec(v_fst_2694_);
lean_del_object(v___x_2692_);
lean_dec(v_tail_2690_);
lean_dec(v_depth_2679_);
lean_dec(v_env_2678_);
lean_dec_ref(v_m_2677_);
lean_dec_ref(v_child_2675_);
lean_dec_ref(v_oracle_2674_);
lean_dec_ref(v_budgets_2673_);
v_snd_2740_ = lean_ctor_get(v___x_2705_, 1);
v_isSharedCheck_2755_ = !lean_is_exclusive(v___x_2705_);
if (v_isSharedCheck_2755_ == 0)
{
lean_object* v_unused_2756_; 
v_unused_2756_ = lean_ctor_get(v___x_2705_, 0);
lean_dec(v_unused_2756_);
v___x_2742_ = v___x_2705_;
v_isShared_2743_ = v_isSharedCheck_2755_;
goto v_resetjp_2741_;
}
else
{
lean_inc(v_snd_2740_);
lean_dec(v___x_2705_);
v___x_2742_ = lean_box(0);
v_isShared_2743_ = v_isSharedCheck_2755_;
goto v_resetjp_2741_;
}
v_resetjp_2741_:
{
uint8_t v_e_2744_; lean_object* v___x_2746_; uint8_t v_isShared_2747_; uint8_t v_isSharedCheck_2754_; 
v_e_2744_ = lean_ctor_get_uint8(v_fst_2706_, 0);
v_isSharedCheck_2754_ = !lean_is_exclusive(v_fst_2706_);
if (v_isSharedCheck_2754_ == 0)
{
v___x_2746_ = v_fst_2706_;
v_isShared_2747_ = v_isSharedCheck_2754_;
goto v_resetjp_2745_;
}
else
{
lean_dec(v_fst_2706_);
v___x_2746_ = lean_box(0);
v_isShared_2747_ = v_isSharedCheck_2754_;
goto v_resetjp_2745_;
}
v_resetjp_2745_:
{
lean_object* v___x_2749_; 
if (v_isShared_2747_ == 0)
{
v___x_2749_ = v___x_2746_;
goto v_reusejp_2748_;
}
else
{
lean_object* v_reuseFailAlloc_2753_; 
v_reuseFailAlloc_2753_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_2753_, 0, v_e_2744_);
v___x_2749_ = v_reuseFailAlloc_2753_;
goto v_reusejp_2748_;
}
v_reusejp_2748_:
{
lean_object* v___x_2751_; 
if (v_isShared_2743_ == 0)
{
lean_ctor_set(v___x_2742_, 0, v___x_2749_);
v___x_2751_ = v___x_2742_;
goto v_reusejp_2750_;
}
else
{
lean_object* v_reuseFailAlloc_2752_; 
v_reuseFailAlloc_2752_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2752_, 0, v___x_2749_);
lean_ctor_set(v_reuseFailAlloc_2752_, 1, v_snd_2740_);
v___x_2751_ = v_reuseFailAlloc_2752_;
goto v_reusejp_2750_;
}
v_reusejp_2750_:
{
return v___x_2751_;
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
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1(lean_object* v_args_2758_, lean_object* v_a_2759_, lean_object* v_a_2760_){
_start:
{
if (lean_obj_tag(v_a_2759_) == 0)
{
lean_object* v___x_2761_; 
v___x_2761_ = l_List_reverse___redArg(v_a_2760_);
return v___x_2761_;
}
else
{
lean_object* v_head_2762_; lean_object* v_tail_2763_; lean_object* v___x_2765_; uint8_t v_isShared_2766_; uint8_t v_isSharedCheck_2788_; 
v_head_2762_ = lean_ctor_get(v_a_2759_, 0);
v_tail_2763_ = lean_ctor_get(v_a_2759_, 1);
v_isSharedCheck_2788_ = !lean_is_exclusive(v_a_2759_);
if (v_isSharedCheck_2788_ == 0)
{
v___x_2765_ = v_a_2759_;
v_isShared_2766_ = v_isSharedCheck_2788_;
goto v_resetjp_2764_;
}
else
{
lean_inc(v_tail_2763_);
lean_inc(v_head_2762_);
lean_dec(v_a_2759_);
v___x_2765_ = lean_box(0);
v_isShared_2766_ = v_isSharedCheck_2788_;
goto v_resetjp_2764_;
}
v_resetjp_2764_:
{
lean_object* v___y_2768_; lean_object* v_fst_2773_; lean_object* v___x_2775_; uint8_t v_isShared_2776_; uint8_t v_isSharedCheck_2786_; 
v_fst_2773_ = lean_ctor_get(v_head_2762_, 0);
v_isSharedCheck_2786_ = !lean_is_exclusive(v_head_2762_);
if (v_isSharedCheck_2786_ == 0)
{
lean_object* v_unused_2787_; 
v_unused_2787_ = lean_ctor_get(v_head_2762_, 1);
lean_dec(v_unused_2787_);
v___x_2775_ = v_head_2762_;
v_isShared_2776_ = v_isSharedCheck_2786_;
goto v_resetjp_2774_;
}
else
{
lean_inc(v_fst_2773_);
lean_dec(v_head_2762_);
v___x_2775_ = lean_box(0);
v_isShared_2776_ = v_isSharedCheck_2786_;
goto v_resetjp_2774_;
}
v___jp_2767_:
{
lean_object* v___x_2770_; 
if (v_isShared_2766_ == 0)
{
lean_ctor_set(v___x_2765_, 1, v_a_2760_);
lean_ctor_set(v___x_2765_, 0, v___y_2768_);
v___x_2770_ = v___x_2765_;
goto v_reusejp_2769_;
}
else
{
lean_object* v_reuseFailAlloc_2772_; 
v_reuseFailAlloc_2772_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2772_, 0, v___y_2768_);
lean_ctor_set(v_reuseFailAlloc_2772_, 1, v_a_2760_);
v___x_2770_ = v_reuseFailAlloc_2772_;
goto v_reusejp_2769_;
}
v_reusejp_2769_:
{
v_a_2759_ = v_tail_2763_;
v_a_2760_ = v___x_2770_;
goto _start;
}
}
v_resetjp_2774_:
{
lean_object* v___x_2777_; 
v___x_2777_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_fst_2773_, v_args_2758_);
if (lean_obj_tag(v___x_2777_) == 0)
{
lean_object* v___x_2778_; lean_object* v___x_2780_; 
v___x_2778_ = lean_box(0);
if (v_isShared_2776_ == 0)
{
lean_ctor_set(v___x_2775_, 1, v___x_2778_);
v___x_2780_ = v___x_2775_;
goto v_reusejp_2779_;
}
else
{
lean_object* v_reuseFailAlloc_2781_; 
v_reuseFailAlloc_2781_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2781_, 0, v_fst_2773_);
lean_ctor_set(v_reuseFailAlloc_2781_, 1, v___x_2778_);
v___x_2780_ = v_reuseFailAlloc_2781_;
goto v_reusejp_2779_;
}
v_reusejp_2779_:
{
v___y_2768_ = v___x_2780_;
goto v___jp_2767_;
}
}
else
{
lean_object* v_val_2782_; lean_object* v___x_2784_; 
v_val_2782_ = lean_ctor_get(v___x_2777_, 0);
lean_inc(v_val_2782_);
lean_dec_ref_known(v___x_2777_, 1);
if (v_isShared_2776_ == 0)
{
lean_ctor_set(v___x_2775_, 1, v_val_2782_);
v___x_2784_ = v___x_2775_;
goto v_reusejp_2783_;
}
else
{
lean_object* v_reuseFailAlloc_2785_; 
v_reuseFailAlloc_2785_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2785_, 0, v_fst_2773_);
lean_ctor_set(v_reuseFailAlloc_2785_, 1, v_val_2782_);
v___x_2784_ = v_reuseFailAlloc_2785_;
goto v_reusejp_2783_;
}
v_reusejp_2783_:
{
v___y_2768_ = v___x_2784_;
goto v___jp_2767_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1___boxed(lean_object* v_args_2789_, lean_object* v_a_2790_, lean_object* v_a_2791_){
_start:
{
lean_object* v_res_2792_; 
v_res_2792_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1(v_args_2789_, v_a_2790_, v_a_2791_);
lean_dec(v_args_2789_);
return v_res_2792_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0(lean_object* v_args_2793_, lean_object* v_x_2794_){
_start:
{
if (lean_obj_tag(v_x_2794_) == 0)
{
uint8_t v___x_2795_; 
v___x_2795_ = 1;
return v___x_2795_;
}
else
{
lean_object* v_head_2796_; lean_object* v_tail_2797_; lean_object* v_fst_2798_; lean_object* v_snd_2799_; lean_object* v___x_2800_; 
v_head_2796_ = lean_ctor_get(v_x_2794_, 0);
v_tail_2797_ = lean_ctor_get(v_x_2794_, 1);
v_fst_2798_ = lean_ctor_get(v_head_2796_, 0);
v_snd_2799_ = lean_ctor_get(v_head_2796_, 1);
v___x_2800_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_fst_2798_, v_args_2793_);
if (lean_obj_tag(v___x_2800_) == 1)
{
lean_object* v_val_2801_; 
v_val_2801_ = lean_ctor_get(v___x_2800_, 0);
lean_inc(v_val_2801_);
lean_dec_ref_known(v___x_2800_, 1);
if (lean_obj_tag(v_val_2801_) == 1)
{
lean_object* v_val_2802_; uint8_t v___x_2803_; uint8_t v___x_2804_; 
v_val_2802_ = lean_ctor_get(v_val_2801_, 0);
lean_inc(v_val_2802_);
lean_dec_ref_known(v_val_2801_, 1);
v___x_2803_ = lean_unbox(v_snd_2799_);
v___x_2804_ = lp_algalVerification_Algal_Source_portAccepts(v___x_2803_, v_val_2802_);
lean_dec(v_val_2802_);
if (v___x_2804_ == 0)
{
return v___x_2804_;
}
else
{
v_x_2794_ = v_tail_2797_;
goto _start;
}
}
else
{
lean_dec(v_val_2801_);
v_x_2794_ = v_tail_2797_;
goto _start;
}
}
else
{
lean_dec(v___x_2800_);
v_x_2794_ = v_tail_2797_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0___boxed(lean_object* v_args_2808_, lean_object* v_x_2809_){
_start:
{
uint8_t v_res_2810_; lean_object* v_r_2811_; 
v_res_2810_ = lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0(v_args_2808_, v_x_2809_);
lean_dec(v_x_2809_);
lean_dec(v_args_2808_);
v_r_2811_ = lean_box(v_res_2810_);
return v_r_2811_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runBody(lean_object* v_budgets_2813_, lean_object* v_oracle_2814_, lean_object* v_child_2815_, lean_object* v_fuel_2816_, lean_object* v_m_2817_, lean_object* v_args_2818_, lean_object* v_scope_2819_, lean_object* v_depth_2820_, lean_object* v_s_2821_){
_start:
{
uint8_t v_e_2823_; lean_object* v_s_2824_; lean_object* v_zero_2827_; uint8_t v_isZero_2828_; 
v_zero_2827_ = lean_unsigned_to_nat(0u);
v_isZero_2828_ = lean_nat_dec_eq(v_fuel_2816_, v_zero_2827_);
if (v_isZero_2828_ == 1)
{
lean_object* v___x_2829_; lean_object* v___x_2830_; 
lean_dec(v_depth_2820_);
lean_dec_ref(v_scope_2819_);
lean_dec_ref(v_m_2817_);
lean_dec_ref(v_child_2815_);
lean_dec_ref(v_oracle_2814_);
lean_dec_ref(v_budgets_2813_);
v___x_2829_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2830_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2830_, 0, v___x_2829_);
lean_ctor_set(v___x_2830_, 1, v_s_2821_);
return v___x_2830_;
}
else
{
lean_object* v_program_2831_; lean_object* v_program_2832_; lean_object* v_parameters_2833_; uint8_t v_output_2834_; lean_object* v_bindings_2835_; lean_object* v_result_2836_; uint8_t v_checked_2837_; 
v_program_2831_ = lean_ctor_get(v_m_2817_, 1);
lean_inc_ref(v_program_2831_);
v_program_2832_ = lp_algalVerification_Algal_Source_canonProgram(v_program_2831_);
v_parameters_2833_ = lean_ctor_get(v_program_2832_, 1);
lean_inc(v_parameters_2833_);
v_output_2834_ = lean_ctor_get_uint8(v_program_2832_, sizeof(void*)*5);
v_bindings_2835_ = lean_ctor_get(v_program_2832_, 2);
lean_inc(v_bindings_2835_);
v_result_2836_ = lean_ctor_get(v_program_2832_, 3);
lean_inc_ref(v_result_2836_);
lean_dec_ref(v_program_2832_);
v_checked_2837_ = lp_algalVerification_List_all___at___00Algal_Source_runBody_spec__0(v_args_2818_, v_parameters_2833_);
if (v_checked_2837_ == 0)
{
lean_object* v___x_2838_; lean_object* v___x_2839_; 
lean_dec_ref(v_result_2836_);
lean_dec(v_bindings_2835_);
lean_dec(v_parameters_2833_);
lean_dec(v_depth_2820_);
lean_dec_ref(v_scope_2819_);
lean_dec_ref(v_m_2817_);
lean_dec_ref(v_child_2815_);
lean_dec_ref(v_oracle_2814_);
lean_dec_ref(v_budgets_2813_);
v___x_2838_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
v___x_2839_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2839_, 0, v___x_2838_);
lean_ctor_set(v___x_2839_, 1, v_s_2821_);
return v___x_2839_;
}
else
{
lean_object* v_one_2840_; lean_object* v_n_2841_; lean_object* v___x_2842_; lean_object* v_env_2843_; lean_object* v___x_2844_; lean_object* v_fst_2845_; 
v_one_2840_ = lean_unsigned_to_nat(1u);
v_n_2841_ = lean_nat_sub(v_fuel_2816_, v_one_2840_);
v___x_2842_ = lean_box(0);
v_env_2843_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_runBody_spec__1(v_args_2818_, v_parameters_2833_, v___x_2842_);
lean_inc(v_depth_2820_);
lean_inc_ref(v_m_2817_);
lean_inc(v_n_2841_);
lean_inc_ref(v_child_2815_);
lean_inc_ref(v_oracle_2814_);
lean_inc_ref(v_budgets_2813_);
v___x_2844_ = lp_algalVerification_Algal_Source_evalBinds(v_budgets_2813_, v_oracle_2814_, v_child_2815_, v_n_2841_, v_m_2817_, v_env_2843_, v_depth_2820_, v_bindings_2835_, v_zero_2827_, v_s_2821_);
v_fst_2845_ = lean_ctor_get(v___x_2844_, 0);
lean_inc(v_fst_2845_);
if (lean_obj_tag(v_fst_2845_) == 0)
{
lean_object* v_snd_2846_; lean_object* v_value_2847_; lean_object* v___x_2848_; lean_object* v___x_2849_; lean_object* v___x_2850_; lean_object* v_fst_2851_; 
v_snd_2846_ = lean_ctor_get(v___x_2844_, 1);
lean_inc(v_snd_2846_);
lean_dec_ref(v___x_2844_);
v_value_2847_ = lean_ctor_get(v_fst_2845_, 0);
lean_inc(v_value_2847_);
lean_dec_ref_known(v_fst_2845_, 1);
v___x_2848_ = ((lean_object*)(lp_algalVerification_Algal_Source_runBody___closed__0));
v___x_2849_ = lean_string_append(v_scope_2819_, v___x_2848_);
v___x_2850_ = lp_algalVerification_Algal_Source_evalTail(v_budgets_2813_, v_oracle_2814_, v_child_2815_, v_n_2841_, v_m_2817_, v_value_2847_, v___x_2849_, v_depth_2820_, v_result_2836_, v_snd_2846_);
lean_dec(v_n_2841_);
v_fst_2851_ = lean_ctor_get(v___x_2850_, 0);
lean_inc(v_fst_2851_);
switch(lean_obj_tag(v_fst_2851_))
{
case 0:
{
lean_object* v_snd_2852_; lean_object* v_value_2853_; uint8_t v___x_2854_; 
v_snd_2852_ = lean_ctor_get(v___x_2850_, 1);
lean_inc(v_snd_2852_);
v_value_2853_ = lean_ctor_get(v_fst_2851_, 0);
lean_inc(v_value_2853_);
lean_dec_ref_known(v_fst_2851_, 1);
v___x_2854_ = lp_algalVerification_Algal_Source_portAccepts(v_output_2834_, v_value_2853_);
lean_dec(v_value_2853_);
if (v___x_2854_ == 0)
{
lean_object* v___x_2856_; uint8_t v_isShared_2857_; uint8_t v_isSharedCheck_2862_; 
v_isSharedCheck_2862_ = !lean_is_exclusive(v___x_2850_);
if (v_isSharedCheck_2862_ == 0)
{
lean_object* v_unused_2863_; lean_object* v_unused_2864_; 
v_unused_2863_ = lean_ctor_get(v___x_2850_, 1);
lean_dec(v_unused_2863_);
v_unused_2864_ = lean_ctor_get(v___x_2850_, 0);
lean_dec(v_unused_2864_);
v___x_2856_ = v___x_2850_;
v_isShared_2857_ = v_isSharedCheck_2862_;
goto v_resetjp_2855_;
}
else
{
lean_dec(v___x_2850_);
v___x_2856_ = lean_box(0);
v_isShared_2857_ = v_isSharedCheck_2862_;
goto v_resetjp_2855_;
}
v_resetjp_2855_:
{
lean_object* v___x_2858_; lean_object* v___x_2860_; 
v___x_2858_ = ((lean_object*)(lp_algalVerification_Algal_Source_evalArms___closed__0));
if (v_isShared_2857_ == 0)
{
lean_ctor_set(v___x_2856_, 0, v___x_2858_);
v___x_2860_ = v___x_2856_;
goto v_reusejp_2859_;
}
else
{
lean_object* v_reuseFailAlloc_2861_; 
v_reuseFailAlloc_2861_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_2861_, 0, v___x_2858_);
lean_ctor_set(v_reuseFailAlloc_2861_, 1, v_snd_2852_);
v___x_2860_ = v_reuseFailAlloc_2861_;
goto v_reusejp_2859_;
}
v_reusejp_2859_:
{
return v___x_2860_;
}
}
}
else
{
lean_dec(v_snd_2852_);
return v___x_2850_;
}
}
case 1:
{
return v___x_2850_;
}
default: 
{
lean_object* v_snd_2865_; uint8_t v_e_2866_; 
v_snd_2865_ = lean_ctor_get(v___x_2850_, 1);
lean_inc(v_snd_2865_);
lean_dec_ref(v___x_2850_);
v_e_2866_ = lean_ctor_get_uint8(v_fst_2851_, 0);
lean_dec_ref_known(v_fst_2851_, 0);
v_e_2823_ = v_e_2866_;
v_s_2824_ = v_snd_2865_;
goto v___jp_2822_;
}
}
}
else
{
lean_object* v_snd_2867_; uint8_t v_e_2868_; 
lean_dec(v_n_2841_);
lean_dec_ref(v_result_2836_);
lean_dec(v_depth_2820_);
lean_dec_ref(v_scope_2819_);
lean_dec_ref(v_m_2817_);
lean_dec_ref(v_child_2815_);
lean_dec_ref(v_oracle_2814_);
lean_dec_ref(v_budgets_2813_);
v_snd_2867_ = lean_ctor_get(v___x_2844_, 1);
lean_inc(v_snd_2867_);
lean_dec_ref(v___x_2844_);
v_e_2868_ = lean_ctor_get_uint8(v_fst_2845_, 0);
lean_dec_ref_known(v_fst_2845_, 0);
v_e_2823_ = v_e_2868_;
v_s_2824_ = v_snd_2867_;
goto v___jp_2822_;
}
}
}
v___jp_2822_:
{
lean_object* v___x_2825_; lean_object* v___x_2826_; 
v___x_2825_ = lean_alloc_ctor(2, 0, 1);
lean_ctor_set_uint8(v___x_2825_, 0, v_e_2823_);
v___x_2826_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2826_, 0, v___x_2825_);
lean_ctor_set(v___x_2826_, 1, v_s_2824_);
return v___x_2826_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runBody___boxed(lean_object* v_budgets_2869_, lean_object* v_oracle_2870_, lean_object* v_child_2871_, lean_object* v_fuel_2872_, lean_object* v_m_2873_, lean_object* v_args_2874_, lean_object* v_scope_2875_, lean_object* v_depth_2876_, lean_object* v_s_2877_){
_start:
{
lean_object* v_res_2878_; 
v_res_2878_ = lp_algalVerification_Algal_Source_runBody(v_budgets_2869_, v_oracle_2870_, v_child_2871_, v_fuel_2872_, v_m_2873_, v_args_2874_, v_scope_2875_, v_depth_2876_, v_s_2877_);
lean_dec(v_args_2874_);
lean_dec(v_fuel_2872_);
return v_res_2878_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___lam__0(lean_object* v_budgets_2879_, lean_object* v_oracle_2880_, lean_object* v_child_2881_, lean_object* v_n_2882_, lean_object* v_m_2883_, lean_object* v_args_2884_, lean_object* v___y_2885_, lean_object* v_depth_2886_, lean_object* v_s_2887_){
_start:
{
lean_object* v___x_2888_; 
v___x_2888_ = lp_algalVerification_Algal_Source_runBody(v_budgets_2879_, v_oracle_2880_, v_child_2881_, v_n_2882_, v_m_2883_, v_args_2884_, v___y_2885_, v_depth_2886_, v_s_2887_);
return v___x_2888_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___lam__0___boxed(lean_object* v_budgets_2889_, lean_object* v_oracle_2890_, lean_object* v_child_2891_, lean_object* v_n_2892_, lean_object* v_m_2893_, lean_object* v_args_2894_, lean_object* v___y_2895_, lean_object* v_depth_2896_, lean_object* v_s_2897_){
_start:
{
lean_object* v_res_2898_; 
v_res_2898_ = lp_algalVerification_Algal_Source_runModule___lam__0(v_budgets_2889_, v_oracle_2890_, v_child_2891_, v_n_2892_, v_m_2893_, v_args_2894_, v___y_2895_, v_depth_2896_, v_s_2897_);
lean_dec(v_args_2894_);
lean_dec(v_n_2892_);
return v_res_2898_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule(lean_object* v_budgets_2902_, lean_object* v_oracle_2903_, lean_object* v_child_2904_, lean_object* v_fuel_2905_, lean_object* v_m_2906_, lean_object* v_args_2907_, lean_object* v_site_2908_, lean_object* v_depth_2909_, lean_object* v_s_2910_){
_start:
{
lean_object* v_zero_2911_; uint8_t v_isZero_2912_; 
v_zero_2911_ = lean_unsigned_to_nat(0u);
v_isZero_2912_ = lean_nat_dec_eq(v_fuel_2905_, v_zero_2911_);
if (v_isZero_2912_ == 1)
{
lean_object* v___x_2913_; lean_object* v___x_2914_; 
lean_dec(v_depth_2909_);
lean_dec_ref(v_site_2908_);
lean_dec(v_args_2907_);
lean_dec_ref(v_m_2906_);
lean_dec_ref(v_child_2904_);
lean_dec_ref(v_oracle_2903_);
lean_dec_ref(v_budgets_2902_);
v___x_2913_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2914_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2914_, 0, v___x_2913_);
lean_ctor_set(v___x_2914_, 1, v_s_2910_);
return v___x_2914_;
}
else
{
lean_object* v_maxDepth_2915_; uint8_t v___x_2916_; 
v_maxDepth_2915_ = lean_ctor_get(v_budgets_2902_, 5);
v___x_2916_ = lean_nat_dec_lt(v_maxDepth_2915_, v_depth_2909_);
if (v___x_2916_ == 0)
{
lean_object* v_one_2917_; lean_object* v_n_2918_; lean_object* v___y_2920_; lean_object* v___x_2930_; uint8_t v___x_2931_; 
v_one_2917_ = lean_unsigned_to_nat(1u);
v_n_2918_ = lean_nat_sub(v_fuel_2905_, v_one_2917_);
v___x_2930_ = lean_string_utf8_byte_size(v_site_2908_);
v___x_2931_ = lean_nat_dec_eq(v___x_2930_, v_zero_2911_);
if (v___x_2931_ == 0)
{
lean_object* v___x_2932_; lean_object* v___x_2933_; 
v___x_2932_ = ((lean_object*)(lp_algalVerification_Algal_Source_runModule___closed__0));
v___x_2933_ = lean_string_append(v_site_2908_, v___x_2932_);
v___y_2920_ = v___x_2933_;
goto v___jp_2919_;
}
else
{
lean_object* v___x_2934_; 
lean_dec_ref(v_site_2908_);
v___x_2934_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__5));
v___y_2920_ = v___x_2934_;
goto v___jp_2919_;
}
v___jp_2919_:
{
lean_object* v_program_2921_; lean_object* v_parameters_2922_; lean_object* v___f_2923_; uint8_t v___x_2924_; 
v_program_2921_ = lean_ctor_get(v_m_2906_, 1);
v_parameters_2922_ = lean_ctor_get(v_program_2921_, 1);
lean_inc(v_parameters_2922_);
lean_inc_ref(v_budgets_2902_);
v___f_2923_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_runModule___lam__0___boxed), 9, 8);
lean_closure_set(v___f_2923_, 0, v_budgets_2902_);
lean_closure_set(v___f_2923_, 1, v_oracle_2903_);
lean_closure_set(v___f_2923_, 2, v_child_2904_);
lean_closure_set(v___f_2923_, 3, v_n_2918_);
lean_closure_set(v___f_2923_, 4, v_m_2906_);
lean_closure_set(v___f_2923_, 5, v_args_2907_);
lean_closure_set(v___f_2923_, 6, v___y_2920_);
lean_closure_set(v___f_2923_, 7, v_depth_2909_);
v___x_2924_ = l_List_isEmpty___redArg(v_parameters_2922_);
lean_dec(v_parameters_2922_);
if (v___x_2924_ == 0)
{
lean_object* v___x_2925_; lean_object* v___x_2926_; 
v___x_2925_ = lp_algalVerification_Algal_Source_step(v_budgets_2902_, v_s_2910_);
lean_dec_ref(v_budgets_2902_);
v___x_2926_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2925_, v___f_2923_);
return v___x_2926_;
}
else
{
lean_object* v___x_2927_; lean_object* v___x_2928_; lean_object* v___x_2929_; 
lean_dec_ref(v_budgets_2902_);
v___x_2927_ = ((lean_object*)(lp_algalVerification_Algal_Source_step___closed__0));
v___x_2928_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2928_, 0, v___x_2927_);
lean_ctor_set(v___x_2928_, 1, v_s_2910_);
v___x_2929_ = lp_algalVerification_Algal_Source_seq___redArg(v___x_2928_, v___f_2923_);
return v___x_2929_;
}
}
}
else
{
lean_object* v___x_2935_; lean_object* v___x_2936_; 
lean_dec(v_depth_2909_);
lean_dec_ref(v_site_2908_);
lean_dec(v_args_2907_);
lean_dec_ref(v_m_2906_);
lean_dec_ref(v_child_2904_);
lean_dec_ref(v_oracle_2903_);
lean_dec_ref(v_budgets_2902_);
v___x_2935_ = ((lean_object*)(lp_algalVerification_Algal_Source_runModule___closed__1));
v___x_2936_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2936_, 0, v___x_2935_);
lean_ctor_set(v___x_2936_, 1, v_s_2910_);
return v___x_2936_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runModule___boxed(lean_object* v_budgets_2937_, lean_object* v_oracle_2938_, lean_object* v_child_2939_, lean_object* v_fuel_2940_, lean_object* v_m_2941_, lean_object* v_args_2942_, lean_object* v_site_2943_, lean_object* v_depth_2944_, lean_object* v_s_2945_){
_start:
{
lean_object* v_res_2946_; 
v_res_2946_ = lp_algalVerification_Algal_Source_runModule(v_budgets_2937_, v_oracle_2938_, v_child_2939_, v_fuel_2940_, v_m_2941_, v_args_2942_, v_site_2943_, v_depth_2944_, v_s_2945_);
lean_dec(v_fuel_2940_);
return v_res_2946_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_mkChild___boxed(lean_object* v_budgets_2947_, lean_object* v_oracle_2948_, lean_object* v_tick_2949_, lean_object* v_fuel_2950_, lean_object* v_a_2951_, lean_object* v_a_2952_, lean_object* v_a_2953_, lean_object* v_a_2954_, lean_object* v_a_2955_){
_start:
{
lean_object* v_res_2956_; 
v_res_2956_ = lp_algalVerification_Algal_Source_mkChild(v_budgets_2947_, v_oracle_2948_, v_tick_2949_, v_fuel_2950_, v_a_2951_, v_a_2952_, v_a_2953_, v_a_2954_, v_a_2955_);
lean_dec(v_fuel_2950_);
return v_res_2956_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_mkChild(lean_object* v_budgets_2957_, lean_object* v_oracle_2958_, lean_object* v_tick_2959_, lean_object* v_fuel_2960_, lean_object* v_a_2961_, lean_object* v_a_2962_, lean_object* v_a_2963_, lean_object* v_a_2964_, lean_object* v_a_2965_){
_start:
{
lean_object* v_zero_2966_; uint8_t v_isZero_2967_; 
v_zero_2966_ = lean_unsigned_to_nat(0u);
v_isZero_2967_ = lean_nat_dec_eq(v_fuel_2960_, v_zero_2966_);
if (v_isZero_2967_ == 1)
{
lean_object* v___x_2968_; lean_object* v___x_2969_; 
lean_dec(v_a_2964_);
lean_dec_ref(v_a_2963_);
lean_dec(v_a_2962_);
lean_dec_ref(v_a_2961_);
lean_dec(v_tick_2959_);
lean_dec_ref(v_oracle_2958_);
lean_dec_ref(v_budgets_2957_);
v___x_2968_ = ((lean_object*)(lp_algalVerification_Algal_Source_eachItems___redArg___closed__0));
v___x_2969_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_2969_, 0, v___x_2968_);
lean_ctor_set(v___x_2969_, 1, v_a_2965_);
return v___x_2969_;
}
else
{
lean_object* v_one_2970_; lean_object* v_n_2971_; lean_object* v___x_2972_; lean_object* v___x_2973_; 
v_one_2970_ = lean_unsigned_to_nat(1u);
v_n_2971_ = lean_nat_sub(v_fuel_2960_, v_one_2970_);
lean_inc(v_tick_2959_);
lean_inc_ref(v_oracle_2958_);
lean_inc_ref(v_budgets_2957_);
v___x_2972_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_mkChild___boxed), 9, 4);
lean_closure_set(v___x_2972_, 0, v_budgets_2957_);
lean_closure_set(v___x_2972_, 1, v_oracle_2958_);
lean_closure_set(v___x_2972_, 2, v_tick_2959_);
lean_closure_set(v___x_2972_, 3, v_n_2971_);
v___x_2973_ = lp_algalVerification_Algal_Source_runModule(v_budgets_2957_, v_oracle_2958_, v___x_2972_, v_tick_2959_, v_a_2961_, v_a_2962_, v_a_2963_, v_a_2964_, v_a_2965_);
lean_dec(v_tick_2959_);
return v___x_2973_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_runProgram(lean_object* v_fuel_2977_, lean_object* v_tick_2978_, lean_object* v_oracle_2979_, lean_object* v_m_2980_, lean_object* v_args_2981_){
_start:
{
lean_object* v_program_2982_; lean_object* v_budgets_2983_; lean_object* v___x_2984_; lean_object* v___x_2985_; lean_object* v___x_2986_; lean_object* v___x_2987_; lean_object* v___x_2988_; 
v_program_2982_ = lean_ctor_get(v_m_2980_, 1);
v_budgets_2983_ = lean_ctor_get(v_program_2982_, 4);
lean_inc_ref_n(v_budgets_2983_, 2);
lean_inc(v_tick_2978_);
lean_inc_ref(v_oracle_2979_);
v___x_2984_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_mkChild___boxed), 9, 4);
lean_closure_set(v___x_2984_, 0, v_budgets_2983_);
lean_closure_set(v___x_2984_, 1, v_oracle_2979_);
lean_closure_set(v___x_2984_, 2, v_tick_2978_);
lean_closure_set(v___x_2984_, 3, v_fuel_2977_);
v___x_2985_ = ((lean_object*)(lp_algalVerification_Algal_Source_normalizeDecision___closed__5));
v___x_2986_ = lean_unsigned_to_nat(1u);
v___x_2987_ = ((lean_object*)(lp_algalVerification_Algal_Source_runProgram___closed__0));
v___x_2988_ = lp_algalVerification_Algal_Source_runModule(v_budgets_2983_, v_oracle_2979_, v___x_2984_, v_tick_2978_, v_m_2980_, v_args_2981_, v___x_2985_, v___x_2986_, v___x_2987_);
lean_dec(v_tick_2978_);
return v___x_2988_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Source_Model(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_KeyOrder(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Source_Eval(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Source_Model(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_KeyOrder(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
