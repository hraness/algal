// Lean compiler output
// Module: Algal.Expr.Model
// Imports: public import Init public meta import Init public import Algal.Core.Binary64 public import Algal.Core.Json public import Algal.Core.JsonString public import Algal.Core.KeyOrder public import Algal.Core.Normalize public import Algal.Core.NumericInjectivity public import Algal.Core.OwnMap public import Algal.Core.Text
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
double lean_float_of_nat(lean_object*);
uint64_t lean_float_to_bits(double);
lean_object* lp_algalVerification_Algal_Core_Binary64_admit(uint64_t);
uint8_t lean_float_decLt(double, double);
double l_Float_ofScientific(lean_object*, uint8_t, lean_object*);
double lean_float_div(double, double);
double lean_float_negate(double);
uint8_t lean_float_decLe(double, double);
double lean_float_sub(double, double);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_lookupFields(lean_object*, lean_object*);
lean_object* lean_string_data(lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* lean_uint32_to_nat(uint32_t);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint32_t l_Char_ofNat(lean_object*);
lean_object* lean_string_mk(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqProd___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object*, lean_object*);
lean_object* l_Repr_addAppParen(lean_object*, lean_object*);
lean_object* lean_nat_to_int(lean_object*);
lean_object* lp_algalVerification_Algal_Core_JsonString_quote(lean_object*);
lean_object* lean_string_utf8_byte_size(lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
double lean_float_of_bits(uint64_t);
lean_object* lp_algalVerification_Algal_Core_Text_utf16(lean_object*);
uint8_t lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(lean_object*, lean_object*);
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
lean_object* lp_algalVerification_Algal_Core_Normalize_fieldsToList(lean_object*);
lean_object* l_List_drop___redArg(lean_object*, lean_object*);
uint8_t lean_float_beq(double, double);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_string_compare(lean_object*, lean_object*);
uint8_t l_instDecidableEqOrdering(uint8_t, uint8_t);
lean_object* lp_algalVerification_Algal_Core_Normalize_normalize(lean_object*);
uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Normalize_itemsToList(lean_object*);
uint64_t lp_algalVerification_Algal_Core_Binary64_normalizeBits(uint64_t);
uint8_t lean_uint64_dec_eq(uint64_t, uint64_t);
uint8_t l_List_isEmpty___redArg(lean_object*);
double floor(double);
double lean_float_add(double, double);
lean_object* lp_algalVerification_Algal_Core_Normalize_canonicalFields(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_ErrCode_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqErrCode(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqErrCode___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 25, .m_capacity = 25, .m_length = 24, .m_data = "Algal.Expr.ErrCode.parse"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Expr.ErrCode.op"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 25, .m_capacity = 25, .m_length = 24, .m_data = "Algal.Expr.ErrCode.arity"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Expr.ErrCode.type"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Expr.ErrCode.path"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Expr.ErrCode.arg"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Expr.ErrCode.num"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__13_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Expr.ErrCode.divZero"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__14_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__15_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 26, .m_capacity = 26, .m_length = 25, .m_data = "Algal.Expr.ErrCode.bounds"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__16_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__17_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Expr.ErrCode.fuel"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__18 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__18_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__18_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__19_value;
static const lean_string_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Expr.ErrCode.unmodeled"};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__20 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__20_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__20_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__21 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__21_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22;
static lean_once_cell_t lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Expr_instReprErrCode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instReprErrCode_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Expr_instReprErrCode = (const lean_object*)&lp_algalVerification_Algal_Expr_instReprErrCode___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_err(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_err___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errWith(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errWith___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Expr_zeroNumber;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Expr_numberOfNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numberOfNat___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numVal(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_errType___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "op"};
static const lean_object* lp_algalVerification_Algal_Expr_errType___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_errType___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errType___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "arg"};
static const lean_object* lp_algalVerification_Algal_Expr_errType___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_errType___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errType___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "want"};
static const lean_object* lp_algalVerification_Algal_Expr_errType___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_errType___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errType___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "got"};
static const lean_object* lp_algalVerification_Algal_Expr_errType___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_errType___closed__3_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errType(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errArity(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_errBounds___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "what"};
static const lean_object* lp_algalVerification_Algal_Expr_errBounds___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_errBounds___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errBounds___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "max"};
static const lean_object* lp_algalVerification_Algal_Expr_errBounds___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_errBounds___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errBounds(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_errFuel___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "cost"};
static const lean_object* lp_algalVerification_Algal_Expr_errFuel___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_errFuel___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errFuel___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "left"};
static const lean_object* lp_algalVerification_Algal_Expr_errFuel___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_errFuel___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errFuel(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errPathWhat(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Expr_numValOfBits___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*0 + 8, .m_other = 0, .m_tag = 2}, .m_objs = {LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Expr_numValOfBits___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_numValOfBits___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numValOfBits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numValOfBits___boxed(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_errNthRange___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 19, .m_capacity = 19, .m_length = 18, .m_data = "index out of range"};
static const lean_object* lp_algalVerification_Algal_Expr_errNthRange___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_errNthRange___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_errNthRange___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_errNthRange___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Expr_errBounds___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Expr_errNthRange___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errNthRange___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 10, .m_capacity = 10, .m_length = 9, .m_data = "indexBits"};
static const lean_object* lp_algalVerification_Algal_Expr_errNthRange___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_errNthRange___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "length"};
static const lean_object* lp_algalVerification_Algal_Expr_errNthRange___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_errNthRange___closed__4_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNthRange(lean_object*, double, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNthRange___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errOp(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNum(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errUnmodeled(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "null"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "bool"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "number"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "text"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "list"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__4_value;
static const lean_string_object lp_algalVerification_Algal_Expr_kindOf___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "map"};
static const lean_object* lp_algalVerification_Algal_Expr_kindOf___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Expr_kindOf___closed__5_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_kindOf(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_kindOf___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxProgramBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxProgramNodes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxProgramDepth;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxEnvBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxValueDepth;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxListLen;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxObjectKeys;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxStringBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxOutputBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxValueBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxVarLen;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_maxFuel;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lookupName(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lookupName___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_pushScope(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_dropScope(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_dropScope___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsLength(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsLength___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsToList(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsFromList(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsReverseAux(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsReverse(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsAppend(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsAppend___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGet(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGet___boxed(lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_itemsGetF___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Expr_itemsGetF___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_itemsGetF___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGetF(lean_object*, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGetF___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsTakeF(lean_object*, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsTakeF___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDropF(lean_object*, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDropF___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsLength(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsLength___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsReverseAux(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsReverse(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_fieldNames_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldNames(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldNames___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fget(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fget___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_fhas(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fhas___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_insertFieldByte(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_sortFieldsByte(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_canonicalizeAcc(lean_object*);
LEAN_EXPORT double lp_algalVerification_Algal_Expr_numFloat(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFloat___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_admitNum(double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_admitNum___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_negZeroF___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_negZeroF___closed__0;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_negZeroF(double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_negZeroF___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_fmin___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_fmin___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Expr_fmin___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_fmin___closed__1;
LEAN_EXPORT double lp_algalVerification_Algal_Expr_fmin(double, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fmin___boxed(lean_object*, lean_object*);
LEAN_EXPORT double lp_algalVerification_Algal_Expr_fmax(double, double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fmax___boxed(lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Expr_jsRound___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static double lp_algalVerification_Algal_Expr_jsRound___closed__0;
LEAN_EXPORT double lp_algalVerification_Algal_Expr_jsRound(double);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_jsRound___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countItemsNodes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countNodes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countFieldsNodes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countFieldsNodes___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countItemsNodes___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countNodes___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDepth(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueDepth(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsDepth(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsDepth___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDepth___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueDepth___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_stringBytes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numberByteBound;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsByteCount(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueByteCount(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsByteCount(lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_addValueBytes___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "value-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_addValueBytes___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_addValueBytes___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_addValueBytes___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_addValueBytes___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Expr_addValueBytes___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_addValueBytes___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_addValueBytes(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_addValueBytes___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Expr_valueBytes___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_valueBytes___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(5) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Expr_valueBytes___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(24) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__2_value;
static const lean_string_object lp_algalVerification_Algal_Expr_bytesFields___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 13, .m_capacity = 13, .m_length = 12, .m_data = "string-bytes"};
static const lean_object* lp_algalVerification_Algal_Expr_bytesFields___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Expr_bytesFields___closed__0_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_bytesFields___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_bytesFields___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Expr_bytesFields___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_bytesFields___closed__2;
static const lean_string_object lp_algalVerification_Algal_Expr_valueBytes___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 9, .m_capacity = 9, .m_length = 8, .m_data = "list-len"};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__3_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__4;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__5;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesFields(lean_object*, lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Expr_valueBytes___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "object-keys"};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__7;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__8_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__8;
static const lean_string_object lp_algalVerification_Algal_Expr_valueBytes___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 12, .m_capacity = 12, .m_length = 11, .m_data = "value-depth"};
static const lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Expr_valueBytes___closed__9_value;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__10;
static lean_once_cell_t lp_algalVerification_Algal_Expr_valueBytes___closed__11_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Expr_valueBytes___closed__11;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueBytes(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesItems(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesItems___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesFields___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueBytes___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkValue(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envBytes_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envBytes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envDepth(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envDepth___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_numEq(uint64_t, uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_eqv(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eqv___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_utf16compare(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_utf16compare___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_isTrimChar(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_isTrimChar___boxed(lean_object*);
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Expr_asciiUpperChar(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asciiUpperChar___boxed(lean_object*);
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Expr_asciiLowerChar(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asciiLowerChar___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_upperStr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_upperStr(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_lowerStr_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lowerStr(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_trimStr(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_charInfix(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charInfix___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorIdx(uint8_t v_x_1_){
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
case 6:
{
lean_object* v___x_8_; 
v___x_8_ = lean_unsigned_to_nat(6u);
return v___x_8_;
}
case 7:
{
lean_object* v___x_9_; 
v___x_9_ = lean_unsigned_to_nat(7u);
return v___x_9_;
}
case 8:
{
lean_object* v___x_10_; 
v___x_10_ = lean_unsigned_to_nat(8u);
return v___x_10_;
}
case 9:
{
lean_object* v___x_11_; 
v___x_11_ = lean_unsigned_to_nat(9u);
return v___x_11_;
}
default: 
{
lean_object* v___x_12_; 
v___x_12_ = lean_unsigned_to_nat(10u);
return v___x_12_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorIdx___boxed(lean_object* v_x_13_){
_start:
{
uint8_t v_x_boxed_14_; lean_object* v_res_15_; 
v_x_boxed_14_ = lean_unbox(v_x_13_);
v_res_15_ = lp_algalVerification_Algal_Expr_ErrCode_ctorIdx(v_x_boxed_14_);
return v_res_15_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___redArg(lean_object* v_k_16_){
_start:
{
lean_inc(v_k_16_);
return v_k_16_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___redArg___boxed(lean_object* v_k_17_){
_start:
{
lean_object* v_res_18_; 
v_res_18_ = lp_algalVerification_Algal_Expr_ErrCode_ctorElim___redArg(v_k_17_);
lean_dec(v_k_17_);
return v_res_18_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim(lean_object* v_motive_19_, lean_object* v_ctorIdx_20_, uint8_t v_t_21_, lean_object* v_h_22_, lean_object* v_k_23_){
_start:
{
lean_inc(v_k_23_);
return v_k_23_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ctorElim___boxed(lean_object* v_motive_24_, lean_object* v_ctorIdx_25_, lean_object* v_t_26_, lean_object* v_h_27_, lean_object* v_k_28_){
_start:
{
uint8_t v_t_boxed_29_; lean_object* v_res_30_; 
v_t_boxed_29_ = lean_unbox(v_t_26_);
v_res_30_ = lp_algalVerification_Algal_Expr_ErrCode_ctorElim(v_motive_24_, v_ctorIdx_25_, v_t_boxed_29_, v_h_27_, v_k_28_);
lean_dec(v_k_28_);
lean_dec(v_ctorIdx_25_);
return v_res_30_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___redArg(lean_object* v_parse_31_){
_start:
{
lean_inc(v_parse_31_);
return v_parse_31_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___redArg___boxed(lean_object* v_parse_32_){
_start:
{
lean_object* v_res_33_; 
v_res_33_ = lp_algalVerification_Algal_Expr_ErrCode_parse_elim___redArg(v_parse_32_);
lean_dec(v_parse_32_);
return v_res_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim(lean_object* v_motive_34_, uint8_t v_t_35_, lean_object* v_h_36_, lean_object* v_parse_37_){
_start:
{
lean_inc(v_parse_37_);
return v_parse_37_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_parse_elim___boxed(lean_object* v_motive_38_, lean_object* v_t_39_, lean_object* v_h_40_, lean_object* v_parse_41_){
_start:
{
uint8_t v_t_boxed_42_; lean_object* v_res_43_; 
v_t_boxed_42_ = lean_unbox(v_t_39_);
v_res_43_ = lp_algalVerification_Algal_Expr_ErrCode_parse_elim(v_motive_38_, v_t_boxed_42_, v_h_40_, v_parse_41_);
lean_dec(v_parse_41_);
return v_res_43_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___redArg(lean_object* v_op_44_){
_start:
{
lean_inc(v_op_44_);
return v_op_44_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___redArg___boxed(lean_object* v_op_45_){
_start:
{
lean_object* v_res_46_; 
v_res_46_ = lp_algalVerification_Algal_Expr_ErrCode_op_elim___redArg(v_op_45_);
lean_dec(v_op_45_);
return v_res_46_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim(lean_object* v_motive_47_, uint8_t v_t_48_, lean_object* v_h_49_, lean_object* v_op_50_){
_start:
{
lean_inc(v_op_50_);
return v_op_50_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_op_elim___boxed(lean_object* v_motive_51_, lean_object* v_t_52_, lean_object* v_h_53_, lean_object* v_op_54_){
_start:
{
uint8_t v_t_boxed_55_; lean_object* v_res_56_; 
v_t_boxed_55_ = lean_unbox(v_t_52_);
v_res_56_ = lp_algalVerification_Algal_Expr_ErrCode_op_elim(v_motive_51_, v_t_boxed_55_, v_h_53_, v_op_54_);
lean_dec(v_op_54_);
return v_res_56_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___redArg(lean_object* v_arity_57_){
_start:
{
lean_inc(v_arity_57_);
return v_arity_57_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___redArg___boxed(lean_object* v_arity_58_){
_start:
{
lean_object* v_res_59_; 
v_res_59_ = lp_algalVerification_Algal_Expr_ErrCode_arity_elim___redArg(v_arity_58_);
lean_dec(v_arity_58_);
return v_res_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim(lean_object* v_motive_60_, uint8_t v_t_61_, lean_object* v_h_62_, lean_object* v_arity_63_){
_start:
{
lean_inc(v_arity_63_);
return v_arity_63_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arity_elim___boxed(lean_object* v_motive_64_, lean_object* v_t_65_, lean_object* v_h_66_, lean_object* v_arity_67_){
_start:
{
uint8_t v_t_boxed_68_; lean_object* v_res_69_; 
v_t_boxed_68_ = lean_unbox(v_t_65_);
v_res_69_ = lp_algalVerification_Algal_Expr_ErrCode_arity_elim(v_motive_64_, v_t_boxed_68_, v_h_66_, v_arity_67_);
lean_dec(v_arity_67_);
return v_res_69_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___redArg(lean_object* v_type_70_){
_start:
{
lean_inc(v_type_70_);
return v_type_70_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___redArg___boxed(lean_object* v_type_71_){
_start:
{
lean_object* v_res_72_; 
v_res_72_ = lp_algalVerification_Algal_Expr_ErrCode_type_elim___redArg(v_type_71_);
lean_dec(v_type_71_);
return v_res_72_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim(lean_object* v_motive_73_, uint8_t v_t_74_, lean_object* v_h_75_, lean_object* v_type_76_){
_start:
{
lean_inc(v_type_76_);
return v_type_76_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_type_elim___boxed(lean_object* v_motive_77_, lean_object* v_t_78_, lean_object* v_h_79_, lean_object* v_type_80_){
_start:
{
uint8_t v_t_boxed_81_; lean_object* v_res_82_; 
v_t_boxed_81_ = lean_unbox(v_t_78_);
v_res_82_ = lp_algalVerification_Algal_Expr_ErrCode_type_elim(v_motive_77_, v_t_boxed_81_, v_h_79_, v_type_80_);
lean_dec(v_type_80_);
return v_res_82_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___redArg(lean_object* v_path_83_){
_start:
{
lean_inc(v_path_83_);
return v_path_83_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___redArg___boxed(lean_object* v_path_84_){
_start:
{
lean_object* v_res_85_; 
v_res_85_ = lp_algalVerification_Algal_Expr_ErrCode_path_elim___redArg(v_path_84_);
lean_dec(v_path_84_);
return v_res_85_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim(lean_object* v_motive_86_, uint8_t v_t_87_, lean_object* v_h_88_, lean_object* v_path_89_){
_start:
{
lean_inc(v_path_89_);
return v_path_89_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_path_elim___boxed(lean_object* v_motive_90_, lean_object* v_t_91_, lean_object* v_h_92_, lean_object* v_path_93_){
_start:
{
uint8_t v_t_boxed_94_; lean_object* v_res_95_; 
v_t_boxed_94_ = lean_unbox(v_t_91_);
v_res_95_ = lp_algalVerification_Algal_Expr_ErrCode_path_elim(v_motive_90_, v_t_boxed_94_, v_h_92_, v_path_93_);
lean_dec(v_path_93_);
return v_res_95_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___redArg(lean_object* v_arg_96_){
_start:
{
lean_inc(v_arg_96_);
return v_arg_96_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___redArg___boxed(lean_object* v_arg_97_){
_start:
{
lean_object* v_res_98_; 
v_res_98_ = lp_algalVerification_Algal_Expr_ErrCode_arg_elim___redArg(v_arg_97_);
lean_dec(v_arg_97_);
return v_res_98_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim(lean_object* v_motive_99_, uint8_t v_t_100_, lean_object* v_h_101_, lean_object* v_arg_102_){
_start:
{
lean_inc(v_arg_102_);
return v_arg_102_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_arg_elim___boxed(lean_object* v_motive_103_, lean_object* v_t_104_, lean_object* v_h_105_, lean_object* v_arg_106_){
_start:
{
uint8_t v_t_boxed_107_; lean_object* v_res_108_; 
v_t_boxed_107_ = lean_unbox(v_t_104_);
v_res_108_ = lp_algalVerification_Algal_Expr_ErrCode_arg_elim(v_motive_103_, v_t_boxed_107_, v_h_105_, v_arg_106_);
lean_dec(v_arg_106_);
return v_res_108_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___redArg(lean_object* v_num_109_){
_start:
{
lean_inc(v_num_109_);
return v_num_109_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___redArg___boxed(lean_object* v_num_110_){
_start:
{
lean_object* v_res_111_; 
v_res_111_ = lp_algalVerification_Algal_Expr_ErrCode_num_elim___redArg(v_num_110_);
lean_dec(v_num_110_);
return v_res_111_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim(lean_object* v_motive_112_, uint8_t v_t_113_, lean_object* v_h_114_, lean_object* v_num_115_){
_start:
{
lean_inc(v_num_115_);
return v_num_115_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_num_elim___boxed(lean_object* v_motive_116_, lean_object* v_t_117_, lean_object* v_h_118_, lean_object* v_num_119_){
_start:
{
uint8_t v_t_boxed_120_; lean_object* v_res_121_; 
v_t_boxed_120_ = lean_unbox(v_t_117_);
v_res_121_ = lp_algalVerification_Algal_Expr_ErrCode_num_elim(v_motive_116_, v_t_boxed_120_, v_h_118_, v_num_119_);
lean_dec(v_num_119_);
return v_res_121_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___redArg(lean_object* v_divZero_122_){
_start:
{
lean_inc(v_divZero_122_);
return v_divZero_122_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___redArg___boxed(lean_object* v_divZero_123_){
_start:
{
lean_object* v_res_124_; 
v_res_124_ = lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___redArg(v_divZero_123_);
lean_dec(v_divZero_123_);
return v_res_124_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim(lean_object* v_motive_125_, uint8_t v_t_126_, lean_object* v_h_127_, lean_object* v_divZero_128_){
_start:
{
lean_inc(v_divZero_128_);
return v_divZero_128_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_divZero_elim___boxed(lean_object* v_motive_129_, lean_object* v_t_130_, lean_object* v_h_131_, lean_object* v_divZero_132_){
_start:
{
uint8_t v_t_boxed_133_; lean_object* v_res_134_; 
v_t_boxed_133_ = lean_unbox(v_t_130_);
v_res_134_ = lp_algalVerification_Algal_Expr_ErrCode_divZero_elim(v_motive_129_, v_t_boxed_133_, v_h_131_, v_divZero_132_);
lean_dec(v_divZero_132_);
return v_res_134_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___redArg(lean_object* v_bounds_135_){
_start:
{
lean_inc(v_bounds_135_);
return v_bounds_135_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___redArg___boxed(lean_object* v_bounds_136_){
_start:
{
lean_object* v_res_137_; 
v_res_137_ = lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___redArg(v_bounds_136_);
lean_dec(v_bounds_136_);
return v_res_137_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim(lean_object* v_motive_138_, uint8_t v_t_139_, lean_object* v_h_140_, lean_object* v_bounds_141_){
_start:
{
lean_inc(v_bounds_141_);
return v_bounds_141_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_bounds_elim___boxed(lean_object* v_motive_142_, lean_object* v_t_143_, lean_object* v_h_144_, lean_object* v_bounds_145_){
_start:
{
uint8_t v_t_boxed_146_; lean_object* v_res_147_; 
v_t_boxed_146_ = lean_unbox(v_t_143_);
v_res_147_ = lp_algalVerification_Algal_Expr_ErrCode_bounds_elim(v_motive_142_, v_t_boxed_146_, v_h_144_, v_bounds_145_);
lean_dec(v_bounds_145_);
return v_res_147_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___redArg(lean_object* v_fuel_148_){
_start:
{
lean_inc(v_fuel_148_);
return v_fuel_148_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___redArg___boxed(lean_object* v_fuel_149_){
_start:
{
lean_object* v_res_150_; 
v_res_150_ = lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___redArg(v_fuel_149_);
lean_dec(v_fuel_149_);
return v_res_150_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim(lean_object* v_motive_151_, uint8_t v_t_152_, lean_object* v_h_153_, lean_object* v_fuel_154_){
_start:
{
lean_inc(v_fuel_154_);
return v_fuel_154_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_fuel_elim___boxed(lean_object* v_motive_155_, lean_object* v_t_156_, lean_object* v_h_157_, lean_object* v_fuel_158_){
_start:
{
uint8_t v_t_boxed_159_; lean_object* v_res_160_; 
v_t_boxed_159_ = lean_unbox(v_t_156_);
v_res_160_ = lp_algalVerification_Algal_Expr_ErrCode_fuel_elim(v_motive_155_, v_t_boxed_159_, v_h_157_, v_fuel_158_);
lean_dec(v_fuel_158_);
return v_res_160_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___redArg(lean_object* v_unmodeled_161_){
_start:
{
lean_inc(v_unmodeled_161_);
return v_unmodeled_161_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___redArg___boxed(lean_object* v_unmodeled_162_){
_start:
{
lean_object* v_res_163_; 
v_res_163_ = lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___redArg(v_unmodeled_162_);
lean_dec(v_unmodeled_162_);
return v_res_163_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim(lean_object* v_motive_164_, uint8_t v_t_165_, lean_object* v_h_166_, lean_object* v_unmodeled_167_){
_start:
{
lean_inc(v_unmodeled_167_);
return v_unmodeled_167_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim___boxed(lean_object* v_motive_168_, lean_object* v_t_169_, lean_object* v_h_170_, lean_object* v_unmodeled_171_){
_start:
{
uint8_t v_t_boxed_172_; lean_object* v_res_173_; 
v_t_boxed_172_ = lean_unbox(v_t_169_);
v_res_173_ = lp_algalVerification_Algal_Expr_ErrCode_unmodeled_elim(v_motive_168_, v_t_boxed_172_, v_h_170_, v_unmodeled_171_);
lean_dec(v_unmodeled_171_);
return v_res_173_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_ErrCode_ofNat(lean_object* v_n_174_){
_start:
{
lean_object* v___x_175_; uint8_t v___x_176_; 
v___x_175_ = lean_unsigned_to_nat(4u);
v___x_176_ = lean_nat_dec_le(v_n_174_, v___x_175_);
if (v___x_176_ == 0)
{
lean_object* v___x_177_; uint8_t v___x_178_; 
v___x_177_ = lean_unsigned_to_nat(7u);
v___x_178_ = lean_nat_dec_le(v_n_174_, v___x_177_);
if (v___x_178_ == 0)
{
lean_object* v___x_179_; uint8_t v___x_180_; 
v___x_179_ = lean_unsigned_to_nat(8u);
v___x_180_ = lean_nat_dec_le(v_n_174_, v___x_179_);
if (v___x_180_ == 0)
{
lean_object* v___x_181_; uint8_t v___x_182_; 
v___x_181_ = lean_unsigned_to_nat(9u);
v___x_182_ = lean_nat_dec_le(v_n_174_, v___x_181_);
if (v___x_182_ == 0)
{
uint8_t v___x_183_; 
v___x_183_ = 10;
return v___x_183_;
}
else
{
uint8_t v___x_184_; 
v___x_184_ = 9;
return v___x_184_;
}
}
else
{
uint8_t v___x_185_; 
v___x_185_ = 8;
return v___x_185_;
}
}
else
{
lean_object* v___x_186_; uint8_t v___x_187_; 
v___x_186_ = lean_unsigned_to_nat(5u);
v___x_187_ = lean_nat_dec_le(v_n_174_, v___x_186_);
if (v___x_187_ == 0)
{
lean_object* v___x_188_; uint8_t v___x_189_; 
v___x_188_ = lean_unsigned_to_nat(6u);
v___x_189_ = lean_nat_dec_le(v_n_174_, v___x_188_);
if (v___x_189_ == 0)
{
uint8_t v___x_190_; 
v___x_190_ = 7;
return v___x_190_;
}
else
{
uint8_t v___x_191_; 
v___x_191_ = 6;
return v___x_191_;
}
}
else
{
uint8_t v___x_192_; 
v___x_192_ = 5;
return v___x_192_;
}
}
}
else
{
lean_object* v___x_193_; uint8_t v___x_194_; 
v___x_193_ = lean_unsigned_to_nat(1u);
v___x_194_ = lean_nat_dec_le(v_n_174_, v___x_193_);
if (v___x_194_ == 0)
{
lean_object* v___x_195_; uint8_t v___x_196_; 
v___x_195_ = lean_unsigned_to_nat(2u);
v___x_196_ = lean_nat_dec_le(v_n_174_, v___x_195_);
if (v___x_196_ == 0)
{
lean_object* v___x_197_; uint8_t v___x_198_; 
v___x_197_ = lean_unsigned_to_nat(3u);
v___x_198_ = lean_nat_dec_le(v_n_174_, v___x_197_);
if (v___x_198_ == 0)
{
uint8_t v___x_199_; 
v___x_199_ = 4;
return v___x_199_;
}
else
{
uint8_t v___x_200_; 
v___x_200_ = 3;
return v___x_200_;
}
}
else
{
uint8_t v___x_201_; 
v___x_201_ = 2;
return v___x_201_;
}
}
else
{
lean_object* v___x_202_; uint8_t v___x_203_; 
v___x_202_ = lean_unsigned_to_nat(0u);
v___x_203_ = lean_nat_dec_le(v_n_174_, v___x_202_);
if (v___x_203_ == 0)
{
uint8_t v___x_204_; 
v___x_204_ = 1;
return v___x_204_;
}
else
{
uint8_t v___x_205_; 
v___x_205_ = 0;
return v___x_205_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_ErrCode_ofNat___boxed(lean_object* v_n_206_){
_start:
{
uint8_t v_res_207_; lean_object* v_r_208_; 
v_res_207_ = lp_algalVerification_Algal_Expr_ErrCode_ofNat(v_n_206_);
lean_dec(v_n_206_);
v_r_208_ = lean_box(v_res_207_);
return v_r_208_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqErrCode(uint8_t v_x_209_, uint8_t v_y_210_){
_start:
{
lean_object* v___x_211_; lean_object* v___x_212_; uint8_t v___x_213_; 
v___x_211_ = lp_algalVerification_Algal_Expr_ErrCode_ctorIdx(v_x_209_);
v___x_212_ = lp_algalVerification_Algal_Expr_ErrCode_ctorIdx(v_y_210_);
v___x_213_ = lean_nat_dec_eq(v___x_211_, v___x_212_);
lean_dec(v___x_212_);
lean_dec(v___x_211_);
return v___x_213_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqErrCode___boxed(lean_object* v_x_214_, lean_object* v_y_215_){
_start:
{
uint8_t v_x_13__boxed_216_; uint8_t v_y_14__boxed_217_; uint8_t v_res_218_; lean_object* v_r_219_; 
v_x_13__boxed_216_ = lean_unbox(v_x_214_);
v_y_14__boxed_217_ = lean_unbox(v_y_215_);
v_res_218_ = lp_algalVerification_Algal_Expr_instDecidableEqErrCode(v_x_13__boxed_216_, v_y_14__boxed_217_);
v_r_219_ = lean_box(v_res_218_);
return v_r_219_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22(void){
_start:
{
lean_object* v___x_253_; lean_object* v___x_254_; 
v___x_253_ = lean_unsigned_to_nat(2u);
v___x_254_ = lean_nat_to_int(v___x_253_);
return v___x_254_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23(void){
_start:
{
lean_object* v___x_255_; lean_object* v___x_256_; 
v___x_255_ = lean_unsigned_to_nat(1u);
v___x_256_ = lean_nat_to_int(v___x_255_);
return v___x_256_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr(uint8_t v_x_257_, lean_object* v_prec_258_){
_start:
{
lean_object* v___y_260_; lean_object* v___y_267_; lean_object* v___y_274_; lean_object* v___y_281_; lean_object* v___y_288_; lean_object* v___y_295_; lean_object* v___y_302_; lean_object* v___y_309_; lean_object* v___y_316_; lean_object* v___y_323_; lean_object* v___y_330_; 
switch(v_x_257_)
{
case 0:
{
lean_object* v___x_336_; uint8_t v___x_337_; 
v___x_336_ = lean_unsigned_to_nat(1024u);
v___x_337_ = lean_nat_dec_le(v___x_336_, v_prec_258_);
if (v___x_337_ == 0)
{
lean_object* v___x_338_; 
v___x_338_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_260_ = v___x_338_;
goto v___jp_259_;
}
else
{
lean_object* v___x_339_; 
v___x_339_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_260_ = v___x_339_;
goto v___jp_259_;
}
}
case 1:
{
lean_object* v___x_340_; uint8_t v___x_341_; 
v___x_340_ = lean_unsigned_to_nat(1024u);
v___x_341_ = lean_nat_dec_le(v___x_340_, v_prec_258_);
if (v___x_341_ == 0)
{
lean_object* v___x_342_; 
v___x_342_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_267_ = v___x_342_;
goto v___jp_266_;
}
else
{
lean_object* v___x_343_; 
v___x_343_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_267_ = v___x_343_;
goto v___jp_266_;
}
}
case 2:
{
lean_object* v___x_344_; uint8_t v___x_345_; 
v___x_344_ = lean_unsigned_to_nat(1024u);
v___x_345_ = lean_nat_dec_le(v___x_344_, v_prec_258_);
if (v___x_345_ == 0)
{
lean_object* v___x_346_; 
v___x_346_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_274_ = v___x_346_;
goto v___jp_273_;
}
else
{
lean_object* v___x_347_; 
v___x_347_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_274_ = v___x_347_;
goto v___jp_273_;
}
}
case 3:
{
lean_object* v___x_348_; uint8_t v___x_349_; 
v___x_348_ = lean_unsigned_to_nat(1024u);
v___x_349_ = lean_nat_dec_le(v___x_348_, v_prec_258_);
if (v___x_349_ == 0)
{
lean_object* v___x_350_; 
v___x_350_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_281_ = v___x_350_;
goto v___jp_280_;
}
else
{
lean_object* v___x_351_; 
v___x_351_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_281_ = v___x_351_;
goto v___jp_280_;
}
}
case 4:
{
lean_object* v___x_352_; uint8_t v___x_353_; 
v___x_352_ = lean_unsigned_to_nat(1024u);
v___x_353_ = lean_nat_dec_le(v___x_352_, v_prec_258_);
if (v___x_353_ == 0)
{
lean_object* v___x_354_; 
v___x_354_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_288_ = v___x_354_;
goto v___jp_287_;
}
else
{
lean_object* v___x_355_; 
v___x_355_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_288_ = v___x_355_;
goto v___jp_287_;
}
}
case 5:
{
lean_object* v___x_356_; uint8_t v___x_357_; 
v___x_356_ = lean_unsigned_to_nat(1024u);
v___x_357_ = lean_nat_dec_le(v___x_356_, v_prec_258_);
if (v___x_357_ == 0)
{
lean_object* v___x_358_; 
v___x_358_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_295_ = v___x_358_;
goto v___jp_294_;
}
else
{
lean_object* v___x_359_; 
v___x_359_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_295_ = v___x_359_;
goto v___jp_294_;
}
}
case 6:
{
lean_object* v___x_360_; uint8_t v___x_361_; 
v___x_360_ = lean_unsigned_to_nat(1024u);
v___x_361_ = lean_nat_dec_le(v___x_360_, v_prec_258_);
if (v___x_361_ == 0)
{
lean_object* v___x_362_; 
v___x_362_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_302_ = v___x_362_;
goto v___jp_301_;
}
else
{
lean_object* v___x_363_; 
v___x_363_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_302_ = v___x_363_;
goto v___jp_301_;
}
}
case 7:
{
lean_object* v___x_364_; uint8_t v___x_365_; 
v___x_364_ = lean_unsigned_to_nat(1024u);
v___x_365_ = lean_nat_dec_le(v___x_364_, v_prec_258_);
if (v___x_365_ == 0)
{
lean_object* v___x_366_; 
v___x_366_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_309_ = v___x_366_;
goto v___jp_308_;
}
else
{
lean_object* v___x_367_; 
v___x_367_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_309_ = v___x_367_;
goto v___jp_308_;
}
}
case 8:
{
lean_object* v___x_368_; uint8_t v___x_369_; 
v___x_368_ = lean_unsigned_to_nat(1024u);
v___x_369_ = lean_nat_dec_le(v___x_368_, v_prec_258_);
if (v___x_369_ == 0)
{
lean_object* v___x_370_; 
v___x_370_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_316_ = v___x_370_;
goto v___jp_315_;
}
else
{
lean_object* v___x_371_; 
v___x_371_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_316_ = v___x_371_;
goto v___jp_315_;
}
}
case 9:
{
lean_object* v___x_372_; uint8_t v___x_373_; 
v___x_372_ = lean_unsigned_to_nat(1024u);
v___x_373_ = lean_nat_dec_le(v___x_372_, v_prec_258_);
if (v___x_373_ == 0)
{
lean_object* v___x_374_; 
v___x_374_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_323_ = v___x_374_;
goto v___jp_322_;
}
else
{
lean_object* v___x_375_; 
v___x_375_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_323_ = v___x_375_;
goto v___jp_322_;
}
}
default: 
{
lean_object* v___x_376_; uint8_t v___x_377_; 
v___x_376_ = lean_unsigned_to_nat(1024u);
v___x_377_ = lean_nat_dec_le(v___x_376_, v_prec_258_);
if (v___x_377_ == 0)
{
lean_object* v___x_378_; 
v___x_378_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__22);
v___y_330_ = v___x_378_;
goto v___jp_329_;
}
else
{
lean_object* v___x_379_; 
v___x_379_ = lean_obj_once(&lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23, &lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23_once, _init_lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__23);
v___y_330_ = v___x_379_;
goto v___jp_329_;
}
}
}
v___jp_259_:
{
lean_object* v___x_261_; lean_object* v___x_262_; uint8_t v___x_263_; lean_object* v___x_264_; lean_object* v___x_265_; 
v___x_261_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__1));
lean_inc(v___y_260_);
v___x_262_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_262_, 0, v___y_260_);
lean_ctor_set(v___x_262_, 1, v___x_261_);
v___x_263_ = 0;
v___x_264_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_264_, 0, v___x_262_);
lean_ctor_set_uint8(v___x_264_, sizeof(void*)*1, v___x_263_);
v___x_265_ = l_Repr_addAppParen(v___x_264_, v_prec_258_);
return v___x_265_;
}
v___jp_266_:
{
lean_object* v___x_268_; lean_object* v___x_269_; uint8_t v___x_270_; lean_object* v___x_271_; lean_object* v___x_272_; 
v___x_268_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__3));
lean_inc(v___y_267_);
v___x_269_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_269_, 0, v___y_267_);
lean_ctor_set(v___x_269_, 1, v___x_268_);
v___x_270_ = 0;
v___x_271_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_271_, 0, v___x_269_);
lean_ctor_set_uint8(v___x_271_, sizeof(void*)*1, v___x_270_);
v___x_272_ = l_Repr_addAppParen(v___x_271_, v_prec_258_);
return v___x_272_;
}
v___jp_273_:
{
lean_object* v___x_275_; lean_object* v___x_276_; uint8_t v___x_277_; lean_object* v___x_278_; lean_object* v___x_279_; 
v___x_275_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__5));
lean_inc(v___y_274_);
v___x_276_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_276_, 0, v___y_274_);
lean_ctor_set(v___x_276_, 1, v___x_275_);
v___x_277_ = 0;
v___x_278_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_278_, 0, v___x_276_);
lean_ctor_set_uint8(v___x_278_, sizeof(void*)*1, v___x_277_);
v___x_279_ = l_Repr_addAppParen(v___x_278_, v_prec_258_);
return v___x_279_;
}
v___jp_280_:
{
lean_object* v___x_282_; lean_object* v___x_283_; uint8_t v___x_284_; lean_object* v___x_285_; lean_object* v___x_286_; 
v___x_282_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__7));
lean_inc(v___y_281_);
v___x_283_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_283_, 0, v___y_281_);
lean_ctor_set(v___x_283_, 1, v___x_282_);
v___x_284_ = 0;
v___x_285_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_285_, 0, v___x_283_);
lean_ctor_set_uint8(v___x_285_, sizeof(void*)*1, v___x_284_);
v___x_286_ = l_Repr_addAppParen(v___x_285_, v_prec_258_);
return v___x_286_;
}
v___jp_287_:
{
lean_object* v___x_289_; lean_object* v___x_290_; uint8_t v___x_291_; lean_object* v___x_292_; lean_object* v___x_293_; 
v___x_289_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__9));
lean_inc(v___y_288_);
v___x_290_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_290_, 0, v___y_288_);
lean_ctor_set(v___x_290_, 1, v___x_289_);
v___x_291_ = 0;
v___x_292_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_292_, 0, v___x_290_);
lean_ctor_set_uint8(v___x_292_, sizeof(void*)*1, v___x_291_);
v___x_293_ = l_Repr_addAppParen(v___x_292_, v_prec_258_);
return v___x_293_;
}
v___jp_294_:
{
lean_object* v___x_296_; lean_object* v___x_297_; uint8_t v___x_298_; lean_object* v___x_299_; lean_object* v___x_300_; 
v___x_296_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__11));
lean_inc(v___y_295_);
v___x_297_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_297_, 0, v___y_295_);
lean_ctor_set(v___x_297_, 1, v___x_296_);
v___x_298_ = 0;
v___x_299_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_299_, 0, v___x_297_);
lean_ctor_set_uint8(v___x_299_, sizeof(void*)*1, v___x_298_);
v___x_300_ = l_Repr_addAppParen(v___x_299_, v_prec_258_);
return v___x_300_;
}
v___jp_301_:
{
lean_object* v___x_303_; lean_object* v___x_304_; uint8_t v___x_305_; lean_object* v___x_306_; lean_object* v___x_307_; 
v___x_303_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__13));
lean_inc(v___y_302_);
v___x_304_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_304_, 0, v___y_302_);
lean_ctor_set(v___x_304_, 1, v___x_303_);
v___x_305_ = 0;
v___x_306_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_306_, 0, v___x_304_);
lean_ctor_set_uint8(v___x_306_, sizeof(void*)*1, v___x_305_);
v___x_307_ = l_Repr_addAppParen(v___x_306_, v_prec_258_);
return v___x_307_;
}
v___jp_308_:
{
lean_object* v___x_310_; lean_object* v___x_311_; uint8_t v___x_312_; lean_object* v___x_313_; lean_object* v___x_314_; 
v___x_310_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__15));
lean_inc(v___y_309_);
v___x_311_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_311_, 0, v___y_309_);
lean_ctor_set(v___x_311_, 1, v___x_310_);
v___x_312_ = 0;
v___x_313_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_313_, 0, v___x_311_);
lean_ctor_set_uint8(v___x_313_, sizeof(void*)*1, v___x_312_);
v___x_314_ = l_Repr_addAppParen(v___x_313_, v_prec_258_);
return v___x_314_;
}
v___jp_315_:
{
lean_object* v___x_317_; lean_object* v___x_318_; uint8_t v___x_319_; lean_object* v___x_320_; lean_object* v___x_321_; 
v___x_317_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__17));
lean_inc(v___y_316_);
v___x_318_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_318_, 0, v___y_316_);
lean_ctor_set(v___x_318_, 1, v___x_317_);
v___x_319_ = 0;
v___x_320_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_320_, 0, v___x_318_);
lean_ctor_set_uint8(v___x_320_, sizeof(void*)*1, v___x_319_);
v___x_321_ = l_Repr_addAppParen(v___x_320_, v_prec_258_);
return v___x_321_;
}
v___jp_322_:
{
lean_object* v___x_324_; lean_object* v___x_325_; uint8_t v___x_326_; lean_object* v___x_327_; lean_object* v___x_328_; 
v___x_324_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__19));
lean_inc(v___y_323_);
v___x_325_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_325_, 0, v___y_323_);
lean_ctor_set(v___x_325_, 1, v___x_324_);
v___x_326_ = 0;
v___x_327_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_327_, 0, v___x_325_);
lean_ctor_set_uint8(v___x_327_, sizeof(void*)*1, v___x_326_);
v___x_328_ = l_Repr_addAppParen(v___x_327_, v_prec_258_);
return v___x_328_;
}
v___jp_329_:
{
lean_object* v___x_331_; lean_object* v___x_332_; uint8_t v___x_333_; lean_object* v___x_334_; lean_object* v___x_335_; 
v___x_331_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instReprErrCode_repr___closed__21));
lean_inc(v___y_330_);
v___x_332_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_332_, 0, v___y_330_);
lean_ctor_set(v___x_332_, 1, v___x_331_);
v___x_333_ = 0;
v___x_334_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_334_, 0, v___x_332_);
lean_ctor_set_uint8(v___x_334_, sizeof(void*)*1, v___x_333_);
v___x_335_ = l_Repr_addAppParen(v___x_334_, v_prec_258_);
return v___x_335_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instReprErrCode_repr___boxed(lean_object* v_x_380_, lean_object* v_prec_381_){
_start:
{
uint8_t v_x_625__boxed_382_; lean_object* v_res_383_; 
v_x_625__boxed_382_ = lean_unbox(v_x_380_);
v_res_383_ = lp_algalVerification_Algal_Expr_instReprErrCode_repr(v_x_625__boxed_382_, v_prec_381_);
lean_dec(v_prec_381_);
return v_res_383_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0(lean_object* v_a_386_, lean_object* v_b_387_){
_start:
{
lean_object* v___x_388_; lean_object* v___x_389_; uint8_t v___x_390_; 
v___x_388_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_389_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed), 2, 0);
v___x_390_ = l_instDecidableEqProd___redArg(v___x_388_, v___x_389_, v_a_386_, v_b_387_);
return v___x_390_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0___boxed(lean_object* v_a_391_, lean_object* v_b_392_){
_start:
{
uint8_t v_res_393_; lean_object* v_r_394_; 
v_res_393_ = lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___lam__0(v_a_391_, v_b_392_);
v_r_394_ = lean_box(v_res_393_);
return v_r_394_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq(lean_object* v_x_396_, lean_object* v_x_397_){
_start:
{
uint8_t v_code_398_; lean_object* v_details_399_; uint8_t v_code_400_; lean_object* v_details_401_; uint8_t v___x_402_; 
v_code_398_ = lean_ctor_get_uint8(v_x_396_, sizeof(void*)*1);
v_details_399_ = lean_ctor_get(v_x_396_, 0);
lean_inc(v_details_399_);
lean_dec_ref(v_x_396_);
v_code_400_ = lean_ctor_get_uint8(v_x_397_, sizeof(void*)*1);
v_details_401_ = lean_ctor_get(v_x_397_, 0);
lean_inc(v_details_401_);
lean_dec_ref(v_x_397_);
v___x_402_ = lp_algalVerification_Algal_Expr_instDecidableEqErrCode(v_code_398_, v_code_400_);
if (v___x_402_ == 0)
{
lean_dec(v_details_401_);
lean_dec(v_details_399_);
return v___x_402_;
}
else
{
lean_object* v___f_403_; uint8_t v___x_404_; 
v___f_403_ = ((lean_object*)(lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___closed__0));
v___x_404_ = l_instDecidableEqList___redArg(v___f_403_, v_details_399_, v_details_401_);
return v___x_404_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq___boxed(lean_object* v_x_405_, lean_object* v_x_406_){
_start:
{
uint8_t v_res_407_; lean_object* v_r_408_; 
v_res_407_ = lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq(v_x_405_, v_x_406_);
v_r_408_ = lean_box(v_res_407_);
return v_r_408_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_instDecidableEqExprErr(lean_object* v_x_409_, lean_object* v_x_410_){
_start:
{
uint8_t v___x_411_; 
v___x_411_ = lp_algalVerification_Algal_Expr_instDecidableEqExprErr_decEq(v_x_409_, v_x_410_);
return v___x_411_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_instDecidableEqExprErr___boxed(lean_object* v_x_412_, lean_object* v_x_413_){
_start:
{
uint8_t v_res_414_; lean_object* v_r_415_; 
v_res_414_ = lp_algalVerification_Algal_Expr_instDecidableEqExprErr(v_x_412_, v_x_413_);
v_r_415_ = lean_box(v_res_414_);
return v_r_415_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_err(uint8_t v_code_416_){
_start:
{
lean_object* v___x_417_; lean_object* v___x_418_; 
v___x_417_ = lean_box(0);
v___x_418_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_418_, 0, v___x_417_);
lean_ctor_set_uint8(v___x_418_, sizeof(void*)*1, v_code_416_);
return v___x_418_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_err___boxed(lean_object* v_code_419_){
_start:
{
uint8_t v_code_boxed_420_; lean_object* v_res_421_; 
v_code_boxed_420_ = lean_unbox(v_code_419_);
v_res_421_ = lp_algalVerification_Algal_Expr_err(v_code_boxed_420_);
return v_res_421_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errWith(uint8_t v_code_422_, lean_object* v_details_423_){
_start:
{
lean_object* v___x_424_; 
v___x_424_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_424_, 0, v_details_423_);
lean_ctor_set_uint8(v___x_424_, sizeof(void*)*1, v_code_422_);
return v___x_424_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errWith___boxed(lean_object* v_code_425_, lean_object* v_details_426_){
_start:
{
uint8_t v_code_boxed_427_; lean_object* v_res_428_; 
v_code_boxed_427_ = lean_unbox(v_code_425_);
v_res_428_ = lp_algalVerification_Algal_Expr_errWith(v_code_boxed_427_, v_details_426_);
return v_res_428_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Expr_zeroNumber(void){
_start:
{
uint64_t v___x_429_; 
v___x_429_ = 0ULL;
return v___x_429_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Expr_numberOfNat(lean_object* v_n_430_){
_start:
{
double v___x_431_; uint64_t v___x_432_; lean_object* v___x_433_; 
v___x_431_ = lean_float_of_nat(v_n_430_);
v___x_432_ = lean_float_to_bits(v___x_431_);
v___x_433_ = lp_algalVerification_Algal_Core_Binary64_admit(v___x_432_);
if (lean_obj_tag(v___x_433_) == 0)
{
uint64_t v___x_434_; 
v___x_434_ = 0ULL;
return v___x_434_;
}
else
{
lean_object* v_val_435_; uint64_t v___x_436_; 
v_val_435_ = lean_ctor_get(v___x_433_, 0);
lean_inc(v_val_435_);
lean_dec_ref_known(v___x_433_, 1);
v___x_436_ = lean_unbox_uint64(v_val_435_);
lean_dec(v_val_435_);
return v___x_436_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numberOfNat___boxed(lean_object* v_n_437_){
_start:
{
uint64_t v_res_438_; lean_object* v_r_439_; 
v_res_438_ = lp_algalVerification_Algal_Expr_numberOfNat(v_n_437_);
v_r_439_ = lean_box_uint64(v_res_438_);
return v_r_439_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numVal(lean_object* v_n_440_){
_start:
{
uint64_t v___x_441_; lean_object* v___x_442_; 
v___x_441_ = lp_algalVerification_Algal_Expr_numberOfNat(v_n_440_);
v___x_442_ = lean_alloc_ctor(2, 0, 8);
lean_ctor_set_uint64(v___x_442_, 0, v___x_441_);
return v___x_442_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errType(lean_object* v_op_447_, lean_object* v_arg_448_, lean_object* v_want_449_, lean_object* v_got_450_){
_start:
{
uint8_t v___x_451_; lean_object* v___x_452_; lean_object* v___x_453_; lean_object* v___x_454_; lean_object* v___x_455_; lean_object* v___x_456_; lean_object* v___x_457_; lean_object* v___x_458_; lean_object* v___x_459_; lean_object* v___x_460_; lean_object* v___x_461_; lean_object* v___x_462_; lean_object* v___x_463_; lean_object* v___x_464_; lean_object* v___x_465_; lean_object* v___x_466_; lean_object* v___x_467_; lean_object* v___x_468_; lean_object* v___x_469_; 
v___x_451_ = 3;
v___x_452_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_453_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_453_, 0, v_op_447_);
v___x_454_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_454_, 0, v___x_452_);
lean_ctor_set(v___x_454_, 1, v___x_453_);
v___x_455_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__1));
v___x_456_ = lp_algalVerification_Algal_Expr_numVal(v_arg_448_);
v___x_457_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_457_, 0, v___x_455_);
lean_ctor_set(v___x_457_, 1, v___x_456_);
v___x_458_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__2));
v___x_459_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_459_, 0, v_want_449_);
v___x_460_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_460_, 0, v___x_458_);
lean_ctor_set(v___x_460_, 1, v___x_459_);
v___x_461_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__3));
v___x_462_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_462_, 0, v_got_450_);
v___x_463_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_463_, 0, v___x_461_);
lean_ctor_set(v___x_463_, 1, v___x_462_);
v___x_464_ = lean_box(0);
v___x_465_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_465_, 0, v___x_463_);
lean_ctor_set(v___x_465_, 1, v___x_464_);
v___x_466_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_466_, 0, v___x_460_);
lean_ctor_set(v___x_466_, 1, v___x_465_);
v___x_467_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_467_, 0, v___x_457_);
lean_ctor_set(v___x_467_, 1, v___x_466_);
v___x_468_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_468_, 0, v___x_454_);
lean_ctor_set(v___x_468_, 1, v___x_467_);
v___x_469_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_469_, 0, v___x_468_);
lean_ctor_set_uint8(v___x_469_, sizeof(void*)*1, v___x_451_);
return v___x_469_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errArity(lean_object* v_op_470_, lean_object* v_want_471_, lean_object* v_got_472_){
_start:
{
uint8_t v___x_473_; lean_object* v___x_474_; lean_object* v___x_475_; lean_object* v___x_476_; lean_object* v___x_477_; lean_object* v___x_478_; lean_object* v___x_479_; lean_object* v___x_480_; lean_object* v___x_481_; lean_object* v___x_482_; lean_object* v___x_483_; lean_object* v___x_484_; lean_object* v___x_485_; lean_object* v___x_486_; lean_object* v___x_487_; 
v___x_473_ = 2;
v___x_474_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_475_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_475_, 0, v_op_470_);
v___x_476_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_476_, 0, v___x_474_);
lean_ctor_set(v___x_476_, 1, v___x_475_);
v___x_477_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__2));
v___x_478_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_478_, 0, v_want_471_);
v___x_479_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_479_, 0, v___x_477_);
lean_ctor_set(v___x_479_, 1, v___x_478_);
v___x_480_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__3));
v___x_481_ = lp_algalVerification_Algal_Expr_numVal(v_got_472_);
v___x_482_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_482_, 0, v___x_480_);
lean_ctor_set(v___x_482_, 1, v___x_481_);
v___x_483_ = lean_box(0);
v___x_484_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_484_, 0, v___x_482_);
lean_ctor_set(v___x_484_, 1, v___x_483_);
v___x_485_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_485_, 0, v___x_479_);
lean_ctor_set(v___x_485_, 1, v___x_484_);
v___x_486_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_486_, 0, v___x_476_);
lean_ctor_set(v___x_486_, 1, v___x_485_);
v___x_487_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_487_, 0, v___x_486_);
lean_ctor_set_uint8(v___x_487_, sizeof(void*)*1, v___x_473_);
return v___x_487_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errBounds(lean_object* v_what_490_, lean_object* v_max_491_){
_start:
{
uint8_t v___x_492_; lean_object* v___x_493_; lean_object* v___x_494_; lean_object* v___x_495_; lean_object* v___x_496_; lean_object* v___x_497_; lean_object* v___x_498_; lean_object* v___x_499_; lean_object* v___x_500_; lean_object* v___x_501_; lean_object* v___x_502_; 
v___x_492_ = 8;
v___x_493_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errBounds___closed__0));
v___x_494_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_494_, 0, v_what_490_);
v___x_495_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_495_, 0, v___x_493_);
lean_ctor_set(v___x_495_, 1, v___x_494_);
v___x_496_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errBounds___closed__1));
v___x_497_ = lp_algalVerification_Algal_Expr_numVal(v_max_491_);
v___x_498_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_498_, 0, v___x_496_);
lean_ctor_set(v___x_498_, 1, v___x_497_);
v___x_499_ = lean_box(0);
v___x_500_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_500_, 0, v___x_498_);
lean_ctor_set(v___x_500_, 1, v___x_499_);
v___x_501_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_501_, 0, v___x_495_);
lean_ctor_set(v___x_501_, 1, v___x_500_);
v___x_502_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_502_, 0, v___x_501_);
lean_ctor_set_uint8(v___x_502_, sizeof(void*)*1, v___x_492_);
return v___x_502_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errFuel(lean_object* v_cost_505_, lean_object* v_left_506_){
_start:
{
uint8_t v___x_507_; lean_object* v___x_508_; lean_object* v___x_509_; lean_object* v___x_510_; lean_object* v___x_511_; lean_object* v___x_512_; lean_object* v___x_513_; lean_object* v___x_514_; lean_object* v___x_515_; lean_object* v___x_516_; lean_object* v___x_517_; 
v___x_507_ = 9;
v___x_508_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errFuel___closed__0));
v___x_509_ = lp_algalVerification_Algal_Expr_numVal(v_cost_505_);
v___x_510_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_510_, 0, v___x_508_);
lean_ctor_set(v___x_510_, 1, v___x_509_);
v___x_511_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errFuel___closed__1));
v___x_512_ = lp_algalVerification_Algal_Expr_numVal(v_left_506_);
v___x_513_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_513_, 0, v___x_511_);
lean_ctor_set(v___x_513_, 1, v___x_512_);
v___x_514_ = lean_box(0);
v___x_515_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_515_, 0, v___x_513_);
lean_ctor_set(v___x_515_, 1, v___x_514_);
v___x_516_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_516_, 0, v___x_510_);
lean_ctor_set(v___x_516_, 1, v___x_515_);
v___x_517_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_517_, 0, v___x_516_);
lean_ctor_set_uint8(v___x_517_, sizeof(void*)*1, v___x_507_);
return v___x_517_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errPathWhat(lean_object* v_op_518_, lean_object* v_what_519_){
_start:
{
uint8_t v___x_520_; lean_object* v___x_521_; lean_object* v___x_522_; lean_object* v___x_523_; lean_object* v___x_524_; lean_object* v___x_525_; lean_object* v___x_526_; lean_object* v___x_527_; lean_object* v___x_528_; lean_object* v___x_529_; lean_object* v___x_530_; 
v___x_520_ = 4;
v___x_521_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_522_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_522_, 0, v_op_518_);
v___x_523_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_523_, 0, v___x_521_);
lean_ctor_set(v___x_523_, 1, v___x_522_);
v___x_524_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errBounds___closed__0));
v___x_525_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_525_, 0, v_what_519_);
v___x_526_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_526_, 0, v___x_524_);
lean_ctor_set(v___x_526_, 1, v___x_525_);
v___x_527_ = lean_box(0);
v___x_528_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_528_, 0, v___x_526_);
lean_ctor_set(v___x_528_, 1, v___x_527_);
v___x_529_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_529_, 0, v___x_523_);
lean_ctor_set(v___x_529_, 1, v___x_528_);
v___x_530_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_530_, 0, v___x_529_);
lean_ctor_set_uint8(v___x_530_, sizeof(void*)*1, v___x_520_);
return v___x_530_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numValOfBits(uint64_t v_bits_533_){
_start:
{
lean_object* v___x_534_; 
v___x_534_ = lp_algalVerification_Algal_Core_Binary64_admit(v_bits_533_);
if (lean_obj_tag(v___x_534_) == 0)
{
lean_object* v___x_535_; 
v___x_535_ = ((lean_object*)(lp_algalVerification_Algal_Expr_numValOfBits___closed__0));
return v___x_535_;
}
else
{
lean_object* v_val_536_; lean_object* v___x_537_; uint64_t v___x_538_; 
v_val_536_ = lean_ctor_get(v___x_534_, 0);
lean_inc(v_val_536_);
lean_dec_ref_known(v___x_534_, 1);
v___x_537_ = lean_alloc_ctor(2, 0, 8);
v___x_538_ = lean_unbox_uint64(v_val_536_);
lean_dec(v_val_536_);
lean_ctor_set_uint64(v___x_537_, 0, v___x_538_);
return v___x_537_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numValOfBits___boxed(lean_object* v_bits_539_){
_start:
{
uint64_t v_bits_boxed_540_; lean_object* v_res_541_; 
v_bits_boxed_540_ = lean_unbox_uint64(v_bits_539_);
lean_dec_ref(v_bits_539_);
v_res_541_ = lp_algalVerification_Algal_Expr_numValOfBits(v_bits_boxed_540_);
return v_res_541_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNthRange(lean_object* v_op_550_, double v_index_551_, lean_object* v_len_552_){
_start:
{
uint8_t v___x_553_; lean_object* v___x_554_; lean_object* v___x_555_; lean_object* v___x_556_; lean_object* v___x_557_; lean_object* v___x_558_; uint64_t v___x_559_; lean_object* v___x_560_; lean_object* v___x_561_; lean_object* v___x_562_; lean_object* v___x_563_; lean_object* v___x_564_; lean_object* v___x_565_; lean_object* v___x_566_; lean_object* v___x_567_; lean_object* v___x_568_; lean_object* v___x_569_; lean_object* v___x_570_; 
v___x_553_ = 4;
v___x_554_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_555_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_555_, 0, v_op_550_);
v___x_556_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_556_, 0, v___x_554_);
lean_ctor_set(v___x_556_, 1, v___x_555_);
v___x_557_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errNthRange___closed__2));
v___x_558_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errNthRange___closed__3));
v___x_559_ = lean_float_to_bits(v_index_551_);
v___x_560_ = lp_algalVerification_Algal_Expr_numValOfBits(v___x_559_);
v___x_561_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_561_, 0, v___x_558_);
lean_ctor_set(v___x_561_, 1, v___x_560_);
v___x_562_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errNthRange___closed__4));
v___x_563_ = lp_algalVerification_Algal_Expr_numVal(v_len_552_);
v___x_564_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_564_, 0, v___x_562_);
lean_ctor_set(v___x_564_, 1, v___x_563_);
v___x_565_ = lean_box(0);
v___x_566_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_566_, 0, v___x_564_);
lean_ctor_set(v___x_566_, 1, v___x_565_);
v___x_567_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_567_, 0, v___x_561_);
lean_ctor_set(v___x_567_, 1, v___x_566_);
v___x_568_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_568_, 0, v___x_557_);
lean_ctor_set(v___x_568_, 1, v___x_567_);
v___x_569_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_569_, 0, v___x_556_);
lean_ctor_set(v___x_569_, 1, v___x_568_);
v___x_570_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_570_, 0, v___x_569_);
lean_ctor_set_uint8(v___x_570_, sizeof(void*)*1, v___x_553_);
return v___x_570_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNthRange___boxed(lean_object* v_op_571_, lean_object* v_index_572_, lean_object* v_len_573_){
_start:
{
double v_index_boxed_574_; lean_object* v_res_575_; 
v_index_boxed_574_ = lean_unbox_float(v_index_572_);
lean_dec_ref(v_index_572_);
v_res_575_ = lp_algalVerification_Algal_Expr_errNthRange(v_op_571_, v_index_boxed_574_, v_len_573_);
return v_res_575_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errOp(lean_object* v_op_576_){
_start:
{
uint8_t v___x_577_; lean_object* v___x_578_; lean_object* v___x_579_; lean_object* v___x_580_; lean_object* v___x_581_; lean_object* v___x_582_; lean_object* v___x_583_; 
v___x_577_ = 1;
v___x_578_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_579_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_579_, 0, v_op_576_);
v___x_580_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_580_, 0, v___x_578_);
lean_ctor_set(v___x_580_, 1, v___x_579_);
v___x_581_ = lean_box(0);
v___x_582_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_582_, 0, v___x_580_);
lean_ctor_set(v___x_582_, 1, v___x_581_);
v___x_583_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_583_, 0, v___x_582_);
lean_ctor_set_uint8(v___x_583_, sizeof(void*)*1, v___x_577_);
return v___x_583_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errArg(lean_object* v_op_584_, lean_object* v_what_585_){
_start:
{
uint8_t v___x_586_; lean_object* v___x_587_; lean_object* v___x_588_; lean_object* v___x_589_; lean_object* v___x_590_; lean_object* v___x_591_; lean_object* v___x_592_; lean_object* v___x_593_; lean_object* v___x_594_; lean_object* v___x_595_; lean_object* v___x_596_; 
v___x_586_ = 5;
v___x_587_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_588_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_588_, 0, v_op_584_);
v___x_589_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_589_, 0, v___x_587_);
lean_ctor_set(v___x_589_, 1, v___x_588_);
v___x_590_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errBounds___closed__0));
v___x_591_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_591_, 0, v_what_585_);
v___x_592_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_592_, 0, v___x_590_);
lean_ctor_set(v___x_592_, 1, v___x_591_);
v___x_593_ = lean_box(0);
v___x_594_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_594_, 0, v___x_592_);
lean_ctor_set(v___x_594_, 1, v___x_593_);
v___x_595_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_595_, 0, v___x_589_);
lean_ctor_set(v___x_595_, 1, v___x_594_);
v___x_596_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_596_, 0, v___x_595_);
lean_ctor_set_uint8(v___x_596_, sizeof(void*)*1, v___x_586_);
return v___x_596_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errNum(lean_object* v_op_597_){
_start:
{
uint8_t v___x_598_; lean_object* v___x_599_; lean_object* v___x_600_; lean_object* v___x_601_; lean_object* v___x_602_; lean_object* v___x_603_; lean_object* v___x_604_; 
v___x_598_ = 6;
v___x_599_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_600_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_600_, 0, v_op_597_);
v___x_601_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_601_, 0, v___x_599_);
lean_ctor_set(v___x_601_, 1, v___x_600_);
v___x_602_ = lean_box(0);
v___x_603_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_603_, 0, v___x_601_);
lean_ctor_set(v___x_603_, 1, v___x_602_);
v___x_604_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_604_, 0, v___x_603_);
lean_ctor_set_uint8(v___x_604_, sizeof(void*)*1, v___x_598_);
return v___x_604_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_errUnmodeled(lean_object* v_op_605_){
_start:
{
uint8_t v___x_606_; lean_object* v___x_607_; lean_object* v___x_608_; lean_object* v___x_609_; lean_object* v___x_610_; lean_object* v___x_611_; lean_object* v___x_612_; 
v___x_606_ = 10;
v___x_607_ = ((lean_object*)(lp_algalVerification_Algal_Expr_errType___closed__0));
v___x_608_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_608_, 0, v_op_605_);
v___x_609_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_609_, 0, v___x_607_);
lean_ctor_set(v___x_609_, 1, v___x_608_);
v___x_610_ = lean_box(0);
v___x_611_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_611_, 0, v___x_609_);
lean_ctor_set(v___x_611_, 1, v___x_610_);
v___x_612_ = lean_alloc_ctor(0, 1, 1);
lean_ctor_set(v___x_612_, 0, v___x_611_);
lean_ctor_set_uint8(v___x_612_, sizeof(void*)*1, v___x_606_);
return v___x_612_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_kindOf(lean_object* v_x_619_){
_start:
{
switch(lean_obj_tag(v_x_619_))
{
case 0:
{
lean_object* v___x_620_; 
v___x_620_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__0));
return v___x_620_;
}
case 1:
{
lean_object* v___x_621_; 
v___x_621_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__1));
return v___x_621_;
}
case 2:
{
lean_object* v___x_622_; 
v___x_622_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__2));
return v___x_622_;
}
case 3:
{
lean_object* v___x_623_; 
v___x_623_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__3));
return v___x_623_;
}
case 4:
{
lean_object* v___x_624_; 
v___x_624_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__4));
return v___x_624_;
}
default: 
{
lean_object* v___x_625_; 
v___x_625_ = ((lean_object*)(lp_algalVerification_Algal_Expr_kindOf___closed__5));
return v___x_625_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_kindOf___boxed(lean_object* v_x_626_){
_start:
{
lean_object* v_res_627_; 
v_res_627_ = lp_algalVerification_Algal_Expr_kindOf(v_x_626_);
lean_dec(v_x_626_);
return v_res_627_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxProgramBytes(void){
_start:
{
lean_object* v___x_628_; 
v___x_628_ = lean_unsigned_to_nat(16384u);
return v___x_628_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxProgramNodes(void){
_start:
{
lean_object* v___x_629_; 
v___x_629_ = lean_unsigned_to_nat(512u);
return v___x_629_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxProgramDepth(void){
_start:
{
lean_object* v___x_630_; 
v___x_630_ = lean_unsigned_to_nat(16u);
return v___x_630_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxEnvBytes(void){
_start:
{
lean_object* v___x_631_; 
v___x_631_ = lean_unsigned_to_nat(262144u);
return v___x_631_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxValueDepth(void){
_start:
{
lean_object* v___x_632_; 
v___x_632_ = lean_unsigned_to_nat(32u);
return v___x_632_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxListLen(void){
_start:
{
lean_object* v___x_633_; 
v___x_633_ = lean_unsigned_to_nat(1024u);
return v___x_633_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxObjectKeys(void){
_start:
{
lean_object* v___x_634_; 
v___x_634_ = lean_unsigned_to_nat(256u);
return v___x_634_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxStringBytes(void){
_start:
{
lean_object* v___x_635_; 
v___x_635_ = lean_unsigned_to_nat(65536u);
return v___x_635_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxOutputBytes(void){
_start:
{
lean_object* v___x_636_; 
v___x_636_ = lean_unsigned_to_nat(65536u);
return v___x_636_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxValueBytes(void){
_start:
{
lean_object* v___x_637_; 
v___x_637_ = lean_unsigned_to_nat(262144u);
return v___x_637_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxVarLen(void){
_start:
{
lean_object* v___x_638_; 
v___x_638_ = lean_unsigned_to_nat(64u);
return v___x_638_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_maxFuel(void){
_start:
{
lean_object* v___x_639_; 
v___x_639_ = lean_unsigned_to_nat(1000000u);
return v___x_639_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lookupName(lean_object* v_env_640_, lean_object* v_scope_641_, lean_object* v_name_642_){
_start:
{
lean_object* v___x_643_; 
v___x_643_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_scope_641_, v_name_642_);
if (lean_obj_tag(v___x_643_) == 0)
{
lean_object* v___x_644_; 
v___x_644_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_env_640_, v_name_642_);
return v___x_644_;
}
else
{
return v___x_643_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lookupName___boxed(lean_object* v_env_645_, lean_object* v_scope_646_, lean_object* v_name_647_){
_start:
{
lean_object* v_res_648_; 
v_res_648_ = lp_algalVerification_Algal_Expr_lookupName(v_env_645_, v_scope_646_, v_name_647_);
lean_dec_ref(v_name_647_);
lean_dec(v_scope_646_);
lean_dec(v_env_645_);
return v_res_648_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_pushScope(lean_object* v_scope_649_, lean_object* v_name_650_, lean_object* v_value_651_){
_start:
{
lean_object* v___x_652_; lean_object* v___x_653_; 
v___x_652_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_652_, 0, v_name_650_);
lean_ctor_set(v___x_652_, 1, v_value_651_);
v___x_653_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_653_, 0, v___x_652_);
lean_ctor_set(v___x_653_, 1, v_scope_649_);
return v___x_653_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_dropScope(lean_object* v_scope_654_, lean_object* v_n_655_){
_start:
{
lean_object* v___x_656_; 
v___x_656_ = l_List_drop___redArg(v_n_655_, v_scope_654_);
return v___x_656_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_dropScope___boxed(lean_object* v_scope_657_, lean_object* v_n_658_){
_start:
{
lean_object* v_res_659_; 
v_res_659_ = lp_algalVerification_Algal_Expr_dropScope(v_scope_657_, v_n_658_);
lean_dec(v_scope_657_);
return v_res_659_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsLength(lean_object* v_x_660_){
_start:
{
if (lean_obj_tag(v_x_660_) == 0)
{
lean_object* v___x_661_; 
v___x_661_ = lean_unsigned_to_nat(0u);
return v___x_661_;
}
else
{
lean_object* v_rest_662_; lean_object* v___x_663_; lean_object* v___x_664_; lean_object* v___x_665_; 
v_rest_662_ = lean_ctor_get(v_x_660_, 1);
v___x_663_ = lean_unsigned_to_nat(1u);
v___x_664_ = lp_algalVerification_Algal_Expr_itemsLength(v_rest_662_);
v___x_665_ = lean_nat_add(v___x_663_, v___x_664_);
lean_dec(v___x_664_);
return v___x_665_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsLength___boxed(lean_object* v_x_666_){
_start:
{
lean_object* v_res_667_; 
v_res_667_ = lp_algalVerification_Algal_Expr_itemsLength(v_x_666_);
lean_dec(v_x_666_);
return v_res_667_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsToList(lean_object* v_a_668_){
_start:
{
lean_object* v___x_669_; 
v___x_669_ = lp_algalVerification_Algal_Core_Normalize_itemsToList(v_a_668_);
return v___x_669_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsFromList(lean_object* v_x_670_){
_start:
{
if (lean_obj_tag(v_x_670_) == 0)
{
lean_object* v___x_671_; 
v___x_671_ = lean_box(0);
return v___x_671_;
}
else
{
lean_object* v_head_672_; lean_object* v_tail_673_; lean_object* v___x_675_; uint8_t v_isShared_676_; uint8_t v_isSharedCheck_681_; 
v_head_672_ = lean_ctor_get(v_x_670_, 0);
v_tail_673_ = lean_ctor_get(v_x_670_, 1);
v_isSharedCheck_681_ = !lean_is_exclusive(v_x_670_);
if (v_isSharedCheck_681_ == 0)
{
v___x_675_ = v_x_670_;
v_isShared_676_ = v_isSharedCheck_681_;
goto v_resetjp_674_;
}
else
{
lean_inc(v_tail_673_);
lean_inc(v_head_672_);
lean_dec(v_x_670_);
v___x_675_ = lean_box(0);
v_isShared_676_ = v_isSharedCheck_681_;
goto v_resetjp_674_;
}
v_resetjp_674_:
{
lean_object* v___x_677_; lean_object* v___x_679_; 
v___x_677_ = lp_algalVerification_Algal_Expr_itemsFromList(v_tail_673_);
if (v_isShared_676_ == 0)
{
lean_ctor_set(v___x_675_, 1, v___x_677_);
v___x_679_ = v___x_675_;
goto v_reusejp_678_;
}
else
{
lean_object* v_reuseFailAlloc_680_; 
v_reuseFailAlloc_680_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_680_, 0, v_head_672_);
lean_ctor_set(v_reuseFailAlloc_680_, 1, v___x_677_);
v___x_679_ = v_reuseFailAlloc_680_;
goto v_reusejp_678_;
}
v_reusejp_678_:
{
return v___x_679_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsReverseAux(lean_object* v_x_682_, lean_object* v_x_683_){
_start:
{
if (lean_obj_tag(v_x_682_) == 0)
{
return v_x_683_;
}
else
{
lean_object* v_value_684_; lean_object* v_rest_685_; lean_object* v___x_687_; uint8_t v_isShared_688_; uint8_t v_isSharedCheck_693_; 
v_value_684_ = lean_ctor_get(v_x_682_, 0);
v_rest_685_ = lean_ctor_get(v_x_682_, 1);
v_isSharedCheck_693_ = !lean_is_exclusive(v_x_682_);
if (v_isSharedCheck_693_ == 0)
{
v___x_687_ = v_x_682_;
v_isShared_688_ = v_isSharedCheck_693_;
goto v_resetjp_686_;
}
else
{
lean_inc(v_rest_685_);
lean_inc(v_value_684_);
lean_dec(v_x_682_);
v___x_687_ = lean_box(0);
v_isShared_688_ = v_isSharedCheck_693_;
goto v_resetjp_686_;
}
v_resetjp_686_:
{
lean_object* v___x_690_; 
if (v_isShared_688_ == 0)
{
lean_ctor_set(v___x_687_, 1, v_x_683_);
v___x_690_ = v___x_687_;
goto v_reusejp_689_;
}
else
{
lean_object* v_reuseFailAlloc_692_; 
v_reuseFailAlloc_692_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_692_, 0, v_value_684_);
lean_ctor_set(v_reuseFailAlloc_692_, 1, v_x_683_);
v___x_690_ = v_reuseFailAlloc_692_;
goto v_reusejp_689_;
}
v_reusejp_689_:
{
v_x_682_ = v_rest_685_;
v_x_683_ = v___x_690_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsReverse(lean_object* v_items_694_){
_start:
{
lean_object* v___x_695_; lean_object* v___x_696_; 
v___x_695_ = lean_box(0);
v___x_696_ = lp_algalVerification_Algal_Expr_itemsReverseAux(v_items_694_, v___x_695_);
return v___x_696_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsAppend(lean_object* v_x_697_, lean_object* v_x_698_){
_start:
{
if (lean_obj_tag(v_x_697_) == 0)
{
lean_inc(v_x_698_);
return v_x_698_;
}
else
{
lean_object* v_value_699_; lean_object* v_rest_700_; lean_object* v___x_702_; uint8_t v_isShared_703_; uint8_t v_isSharedCheck_708_; 
v_value_699_ = lean_ctor_get(v_x_697_, 0);
v_rest_700_ = lean_ctor_get(v_x_697_, 1);
v_isSharedCheck_708_ = !lean_is_exclusive(v_x_697_);
if (v_isSharedCheck_708_ == 0)
{
v___x_702_ = v_x_697_;
v_isShared_703_ = v_isSharedCheck_708_;
goto v_resetjp_701_;
}
else
{
lean_inc(v_rest_700_);
lean_inc(v_value_699_);
lean_dec(v_x_697_);
v___x_702_ = lean_box(0);
v_isShared_703_ = v_isSharedCheck_708_;
goto v_resetjp_701_;
}
v_resetjp_701_:
{
lean_object* v___x_704_; lean_object* v___x_706_; 
v___x_704_ = lp_algalVerification_Algal_Expr_itemsAppend(v_rest_700_, v_x_698_);
if (v_isShared_703_ == 0)
{
lean_ctor_set(v___x_702_, 1, v___x_704_);
v___x_706_ = v___x_702_;
goto v_reusejp_705_;
}
else
{
lean_object* v_reuseFailAlloc_707_; 
v_reuseFailAlloc_707_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_707_, 0, v_value_699_);
lean_ctor_set(v_reuseFailAlloc_707_, 1, v___x_704_);
v___x_706_ = v_reuseFailAlloc_707_;
goto v_reusejp_705_;
}
v_reusejp_705_:
{
return v___x_706_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsAppend___boxed(lean_object* v_x_709_, lean_object* v_x_710_){
_start:
{
lean_object* v_res_711_; 
v_res_711_ = lp_algalVerification_Algal_Expr_itemsAppend(v_x_709_, v_x_710_);
lean_dec(v_x_710_);
return v_res_711_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGet(lean_object* v_x_712_, lean_object* v_x_713_){
_start:
{
if (lean_obj_tag(v_x_712_) == 0)
{
lean_object* v___x_714_; 
lean_dec(v_x_713_);
v___x_714_ = lean_box(0);
return v___x_714_;
}
else
{
lean_object* v_value_715_; lean_object* v_rest_716_; lean_object* v___x_717_; uint8_t v___x_718_; 
v_value_715_ = lean_ctor_get(v_x_712_, 0);
v_rest_716_ = lean_ctor_get(v_x_712_, 1);
v___x_717_ = lean_unsigned_to_nat(0u);
v___x_718_ = lean_nat_dec_eq(v_x_713_, v___x_717_);
if (v___x_718_ == 0)
{
lean_object* v___x_719_; lean_object* v___x_720_; 
v___x_719_ = lean_unsigned_to_nat(1u);
v___x_720_ = lean_nat_sub(v_x_713_, v___x_719_);
lean_dec(v_x_713_);
v_x_712_ = v_rest_716_;
v_x_713_ = v___x_720_;
goto _start;
}
else
{
lean_object* v___x_722_; 
lean_dec(v_x_713_);
lean_inc(v_value_715_);
v___x_722_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_722_, 0, v_value_715_);
return v___x_722_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGet___boxed(lean_object* v_x_723_, lean_object* v_x_724_){
_start:
{
lean_object* v_res_725_; 
v_res_725_ = lp_algalVerification_Algal_Expr_itemsGet(v_x_723_, v_x_724_);
lean_dec(v_x_723_);
return v_res_725_;
}
}
static double _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0(void){
_start:
{
lean_object* v___x_726_; double v___x_727_; 
v___x_726_ = lean_unsigned_to_nat(0u);
v___x_727_ = lean_float_of_nat(v___x_726_);
return v___x_727_;
}
}
static double _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__1(void){
_start:
{
lean_object* v___x_728_; double v___x_729_; 
v___x_728_ = lean_unsigned_to_nat(1u);
v___x_729_ = lean_float_of_nat(v___x_728_);
return v___x_729_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGetF(lean_object* v_x_730_, double v_x_731_){
_start:
{
if (lean_obj_tag(v_x_730_) == 0)
{
lean_object* v___x_732_; 
v___x_732_ = lean_box(0);
return v___x_732_;
}
else
{
lean_object* v_value_733_; lean_object* v_rest_734_; double v___x_735_; uint8_t v___x_736_; 
v_value_733_ = lean_ctor_get(v_x_730_, 0);
v_rest_734_ = lean_ctor_get(v_x_730_, 1);
v___x_735_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__0, &lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0);
v___x_736_ = lean_float_decLe(v_x_731_, v___x_735_);
if (v___x_736_ == 0)
{
double v___x_737_; double v___x_738_; 
v___x_737_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__1, &lp_algalVerification_Algal_Expr_itemsGetF___closed__1_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__1);
v___x_738_ = lean_float_sub(v_x_731_, v___x_737_);
v_x_730_ = v_rest_734_;
v_x_731_ = v___x_738_;
goto _start;
}
else
{
lean_object* v___x_740_; 
lean_inc(v_value_733_);
v___x_740_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_740_, 0, v_value_733_);
return v___x_740_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsGetF___boxed(lean_object* v_x_741_, lean_object* v_x_742_){
_start:
{
double v_x_63__boxed_743_; lean_object* v_res_744_; 
v_x_63__boxed_743_ = lean_unbox_float(v_x_742_);
lean_dec_ref(v_x_742_);
v_res_744_ = lp_algalVerification_Algal_Expr_itemsGetF(v_x_741_, v_x_63__boxed_743_);
lean_dec(v_x_741_);
return v_res_744_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsTakeF(lean_object* v_x_745_, double v_x_746_){
_start:
{
if (lean_obj_tag(v_x_745_) == 0)
{
return v_x_745_;
}
else
{
lean_object* v_value_747_; lean_object* v_rest_748_; lean_object* v___x_750_; uint8_t v_isShared_751_; uint8_t v_isSharedCheck_761_; 
v_value_747_ = lean_ctor_get(v_x_745_, 0);
v_rest_748_ = lean_ctor_get(v_x_745_, 1);
v_isSharedCheck_761_ = !lean_is_exclusive(v_x_745_);
if (v_isSharedCheck_761_ == 0)
{
v___x_750_ = v_x_745_;
v_isShared_751_ = v_isSharedCheck_761_;
goto v_resetjp_749_;
}
else
{
lean_inc(v_rest_748_);
lean_inc(v_value_747_);
lean_dec(v_x_745_);
v___x_750_ = lean_box(0);
v_isShared_751_ = v_isSharedCheck_761_;
goto v_resetjp_749_;
}
v_resetjp_749_:
{
double v___x_752_; uint8_t v___x_753_; 
v___x_752_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__0, &lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0);
v___x_753_ = lean_float_decLe(v_x_746_, v___x_752_);
if (v___x_753_ == 0)
{
double v___x_754_; double v___x_755_; lean_object* v___x_756_; lean_object* v___x_758_; 
v___x_754_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__1, &lp_algalVerification_Algal_Expr_itemsGetF___closed__1_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__1);
v___x_755_ = lean_float_sub(v_x_746_, v___x_754_);
v___x_756_ = lp_algalVerification_Algal_Expr_itemsTakeF(v_rest_748_, v___x_755_);
if (v_isShared_751_ == 0)
{
lean_ctor_set(v___x_750_, 1, v___x_756_);
v___x_758_ = v___x_750_;
goto v_reusejp_757_;
}
else
{
lean_object* v_reuseFailAlloc_759_; 
v_reuseFailAlloc_759_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_759_, 0, v_value_747_);
lean_ctor_set(v_reuseFailAlloc_759_, 1, v___x_756_);
v___x_758_ = v_reuseFailAlloc_759_;
goto v_reusejp_757_;
}
v_reusejp_757_:
{
return v___x_758_;
}
}
else
{
lean_object* v___x_760_; 
lean_del_object(v___x_750_);
lean_dec(v_rest_748_);
lean_dec(v_value_747_);
v___x_760_ = lean_box(0);
return v___x_760_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsTakeF___boxed(lean_object* v_x_762_, lean_object* v_x_763_){
_start:
{
double v_x_61__boxed_764_; lean_object* v_res_765_; 
v_x_61__boxed_764_ = lean_unbox_float(v_x_763_);
lean_dec_ref(v_x_763_);
v_res_765_ = lp_algalVerification_Algal_Expr_itemsTakeF(v_x_762_, v_x_61__boxed_764_);
return v_res_765_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDropF(lean_object* v_x_766_, double v_x_767_){
_start:
{
if (lean_obj_tag(v_x_766_) == 0)
{
return v_x_766_;
}
else
{
lean_object* v_rest_768_; double v___x_769_; uint8_t v___x_770_; 
v_rest_768_ = lean_ctor_get(v_x_766_, 1);
v___x_769_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__0, &lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0);
v___x_770_ = lean_float_decLe(v_x_767_, v___x_769_);
if (v___x_770_ == 0)
{
double v___x_771_; double v___x_772_; 
v___x_771_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__1, &lp_algalVerification_Algal_Expr_itemsGetF___closed__1_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__1);
v___x_772_ = lean_float_sub(v_x_767_, v___x_771_);
v_x_766_ = v_rest_768_;
v_x_767_ = v___x_772_;
goto _start;
}
else
{
lean_inc_ref(v_x_766_);
return v_x_766_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDropF___boxed(lean_object* v_x_774_, lean_object* v_x_775_){
_start:
{
double v_x_59__boxed_776_; lean_object* v_res_777_; 
v_x_59__boxed_776_ = lean_unbox_float(v_x_775_);
lean_dec_ref(v_x_775_);
v_res_777_ = lp_algalVerification_Algal_Expr_itemsDropF(v_x_774_, v_x_59__boxed_776_);
lean_dec(v_x_774_);
return v_res_777_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsLength(lean_object* v_x_778_){
_start:
{
if (lean_obj_tag(v_x_778_) == 0)
{
lean_object* v___x_779_; 
v___x_779_ = lean_unsigned_to_nat(0u);
return v___x_779_;
}
else
{
lean_object* v_rest_780_; lean_object* v___x_781_; lean_object* v___x_782_; lean_object* v___x_783_; 
v_rest_780_ = lean_ctor_get(v_x_778_, 2);
v___x_781_ = lean_unsigned_to_nat(1u);
v___x_782_ = lp_algalVerification_Algal_Expr_fieldsLength(v_rest_780_);
v___x_783_ = lean_nat_add(v___x_781_, v___x_782_);
lean_dec(v___x_782_);
return v___x_783_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsLength___boxed(lean_object* v_x_784_){
_start:
{
lean_object* v_res_785_; 
v_res_785_ = lp_algalVerification_Algal_Expr_fieldsLength(v_x_784_);
lean_dec(v_x_784_);
return v_res_785_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsReverseAux(lean_object* v_x_786_, lean_object* v_x_787_){
_start:
{
if (lean_obj_tag(v_x_786_) == 0)
{
return v_x_787_;
}
else
{
lean_object* v_key_788_; lean_object* v_value_789_; lean_object* v_rest_790_; lean_object* v___x_792_; uint8_t v_isShared_793_; uint8_t v_isSharedCheck_798_; 
v_key_788_ = lean_ctor_get(v_x_786_, 0);
v_value_789_ = lean_ctor_get(v_x_786_, 1);
v_rest_790_ = lean_ctor_get(v_x_786_, 2);
v_isSharedCheck_798_ = !lean_is_exclusive(v_x_786_);
if (v_isSharedCheck_798_ == 0)
{
v___x_792_ = v_x_786_;
v_isShared_793_ = v_isSharedCheck_798_;
goto v_resetjp_791_;
}
else
{
lean_inc(v_rest_790_);
lean_inc(v_value_789_);
lean_inc(v_key_788_);
lean_dec(v_x_786_);
v___x_792_ = lean_box(0);
v_isShared_793_ = v_isSharedCheck_798_;
goto v_resetjp_791_;
}
v_resetjp_791_:
{
lean_object* v___x_795_; 
if (v_isShared_793_ == 0)
{
lean_ctor_set(v___x_792_, 2, v_x_787_);
v___x_795_ = v___x_792_;
goto v_reusejp_794_;
}
else
{
lean_object* v_reuseFailAlloc_797_; 
v_reuseFailAlloc_797_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v_reuseFailAlloc_797_, 0, v_key_788_);
lean_ctor_set(v_reuseFailAlloc_797_, 1, v_value_789_);
lean_ctor_set(v_reuseFailAlloc_797_, 2, v_x_787_);
v___x_795_ = v_reuseFailAlloc_797_;
goto v_reusejp_794_;
}
v_reusejp_794_:
{
v_x_786_ = v_rest_790_;
v_x_787_ = v___x_795_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsReverse(lean_object* v_fields_799_){
_start:
{
lean_object* v___x_800_; lean_object* v___x_801_; 
v___x_800_ = lean_box(0);
v___x_801_ = lp_algalVerification_Algal_Expr_fieldsReverseAux(v_fields_799_, v___x_800_);
return v___x_801_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_fieldNames_spec__0(lean_object* v_a_802_, lean_object* v_a_803_){
_start:
{
if (lean_obj_tag(v_a_802_) == 0)
{
lean_object* v___x_804_; 
v___x_804_ = l_List_reverse___redArg(v_a_803_);
return v___x_804_;
}
else
{
lean_object* v_head_805_; lean_object* v_tail_806_; lean_object* v___x_808_; uint8_t v_isShared_809_; uint8_t v_isSharedCheck_815_; 
v_head_805_ = lean_ctor_get(v_a_802_, 0);
v_tail_806_ = lean_ctor_get(v_a_802_, 1);
v_isSharedCheck_815_ = !lean_is_exclusive(v_a_802_);
if (v_isSharedCheck_815_ == 0)
{
v___x_808_ = v_a_802_;
v_isShared_809_ = v_isSharedCheck_815_;
goto v_resetjp_807_;
}
else
{
lean_inc(v_tail_806_);
lean_inc(v_head_805_);
lean_dec(v_a_802_);
v___x_808_ = lean_box(0);
v_isShared_809_ = v_isSharedCheck_815_;
goto v_resetjp_807_;
}
v_resetjp_807_:
{
lean_object* v_fst_810_; lean_object* v___x_812_; 
v_fst_810_ = lean_ctor_get(v_head_805_, 0);
lean_inc(v_fst_810_);
lean_dec(v_head_805_);
if (v_isShared_809_ == 0)
{
lean_ctor_set(v___x_808_, 1, v_a_803_);
lean_ctor_set(v___x_808_, 0, v_fst_810_);
v___x_812_ = v___x_808_;
goto v_reusejp_811_;
}
else
{
lean_object* v_reuseFailAlloc_814_; 
v_reuseFailAlloc_814_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_814_, 0, v_fst_810_);
lean_ctor_set(v_reuseFailAlloc_814_, 1, v_a_803_);
v___x_812_ = v_reuseFailAlloc_814_;
goto v_reusejp_811_;
}
v_reusejp_811_:
{
v_a_802_ = v_tail_806_;
v_a_803_ = v___x_812_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldNames(lean_object* v_fields_816_){
_start:
{
lean_object* v___x_817_; lean_object* v___x_818_; lean_object* v___x_819_; 
v___x_817_ = lp_algalVerification_Algal_Core_Normalize_fieldsToList(v_fields_816_);
v___x_818_ = lean_box(0);
v___x_819_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_fieldNames_spec__0(v___x_817_, v___x_818_);
return v___x_819_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldNames___boxed(lean_object* v_fields_820_){
_start:
{
lean_object* v_res_821_; 
v_res_821_ = lp_algalVerification_Algal_Expr_fieldNames(v_fields_820_);
lean_dec(v_fields_820_);
return v_res_821_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fget(lean_object* v_fields_822_, lean_object* v_key_823_){
_start:
{
lean_object* v___x_824_; 
v___x_824_ = lp_algalVerification_Algal_Core_Normalize_lookupFields(v_fields_822_, v_key_823_);
return v___x_824_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fget___boxed(lean_object* v_fields_825_, lean_object* v_key_826_){
_start:
{
lean_object* v_res_827_; 
v_res_827_ = lp_algalVerification_Algal_Expr_fget(v_fields_825_, v_key_826_);
lean_dec_ref(v_key_826_);
lean_dec(v_fields_825_);
return v_res_827_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_fhas(lean_object* v_fields_828_, lean_object* v_key_829_){
_start:
{
lean_object* v___x_830_; 
v___x_830_ = lp_algalVerification_Algal_Core_Normalize_lookupFields(v_fields_828_, v_key_829_);
if (lean_obj_tag(v___x_830_) == 0)
{
uint8_t v___x_831_; 
v___x_831_ = 0;
return v___x_831_;
}
else
{
uint8_t v___x_832_; 
lean_dec_ref_known(v___x_830_, 1);
v___x_832_ = 1;
return v___x_832_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fhas___boxed(lean_object* v_fields_833_, lean_object* v_key_834_){
_start:
{
uint8_t v_res_835_; lean_object* v_r_836_; 
v_res_835_ = lp_algalVerification_Algal_Expr_fhas(v_fields_833_, v_key_834_);
lean_dec_ref(v_key_834_);
lean_dec(v_fields_833_);
v_r_836_ = lean_box(v_res_835_);
return v_r_836_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_insertFieldByte(lean_object* v_key_837_, lean_object* v_v_838_, lean_object* v_x_839_){
_start:
{
if (lean_obj_tag(v_x_839_) == 0)
{
lean_object* v___x_840_; 
v___x_840_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_840_, 0, v_key_837_);
lean_ctor_set(v___x_840_, 1, v_v_838_);
lean_ctor_set(v___x_840_, 2, v_x_839_);
return v___x_840_;
}
else
{
lean_object* v_key_841_; lean_object* v_value_842_; lean_object* v_rest_843_; uint8_t v___x_844_; uint8_t v___x_845_; uint8_t v___x_846_; 
v_key_841_ = lean_ctor_get(v_x_839_, 0);
v_value_842_ = lean_ctor_get(v_x_839_, 1);
v_rest_843_ = lean_ctor_get(v_x_839_, 2);
v___x_844_ = lean_string_compare(v_key_837_, v_key_841_);
v___x_845_ = 2;
v___x_846_ = l_instDecidableEqOrdering(v___x_844_, v___x_845_);
if (v___x_846_ == 0)
{
lean_object* v___x_847_; 
v___x_847_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_847_, 0, v_key_837_);
lean_ctor_set(v___x_847_, 1, v_v_838_);
lean_ctor_set(v___x_847_, 2, v_x_839_);
return v___x_847_;
}
else
{
lean_object* v___x_849_; uint8_t v_isShared_850_; uint8_t v_isSharedCheck_855_; 
lean_inc(v_rest_843_);
lean_inc(v_value_842_);
lean_inc_ref(v_key_841_);
v_isSharedCheck_855_ = !lean_is_exclusive(v_x_839_);
if (v_isSharedCheck_855_ == 0)
{
lean_object* v_unused_856_; lean_object* v_unused_857_; lean_object* v_unused_858_; 
v_unused_856_ = lean_ctor_get(v_x_839_, 2);
lean_dec(v_unused_856_);
v_unused_857_ = lean_ctor_get(v_x_839_, 1);
lean_dec(v_unused_857_);
v_unused_858_ = lean_ctor_get(v_x_839_, 0);
lean_dec(v_unused_858_);
v___x_849_ = v_x_839_;
v_isShared_850_ = v_isSharedCheck_855_;
goto v_resetjp_848_;
}
else
{
lean_dec(v_x_839_);
v___x_849_ = lean_box(0);
v_isShared_850_ = v_isSharedCheck_855_;
goto v_resetjp_848_;
}
v_resetjp_848_:
{
lean_object* v___x_851_; lean_object* v___x_853_; 
v___x_851_ = lp_algalVerification_Algal_Expr_insertFieldByte(v_key_837_, v_v_838_, v_rest_843_);
if (v_isShared_850_ == 0)
{
lean_ctor_set(v___x_849_, 2, v___x_851_);
v___x_853_ = v___x_849_;
goto v_reusejp_852_;
}
else
{
lean_object* v_reuseFailAlloc_854_; 
v_reuseFailAlloc_854_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v_reuseFailAlloc_854_, 0, v_key_841_);
lean_ctor_set(v_reuseFailAlloc_854_, 1, v_value_842_);
lean_ctor_set(v_reuseFailAlloc_854_, 2, v___x_851_);
v___x_853_ = v_reuseFailAlloc_854_;
goto v_reusejp_852_;
}
v_reusejp_852_:
{
return v___x_853_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_sortFieldsByte(lean_object* v_x_859_){
_start:
{
if (lean_obj_tag(v_x_859_) == 0)
{
return v_x_859_;
}
else
{
lean_object* v_key_860_; lean_object* v_value_861_; lean_object* v_rest_862_; lean_object* v___x_863_; lean_object* v___x_864_; 
v_key_860_ = lean_ctor_get(v_x_859_, 0);
lean_inc_ref(v_key_860_);
v_value_861_ = lean_ctor_get(v_x_859_, 1);
lean_inc(v_value_861_);
v_rest_862_ = lean_ctor_get(v_x_859_, 2);
lean_inc(v_rest_862_);
lean_dec_ref_known(v_x_859_, 3);
v___x_863_ = lp_algalVerification_Algal_Expr_sortFieldsByte(v_rest_862_);
v___x_864_ = lp_algalVerification_Algal_Expr_insertFieldByte(v_key_860_, v_value_861_, v___x_863_);
return v___x_864_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_canonicalizeAcc(lean_object* v_acc_865_){
_start:
{
lean_object* v___x_866_; lean_object* v___x_867_; 
v___x_866_ = lp_algalVerification_Algal_Expr_fieldsReverse(v_acc_865_);
v___x_867_ = lp_algalVerification_Algal_Core_Normalize_canonicalFields(v___x_866_);
lean_dec(v___x_866_);
return v___x_867_;
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_numFloat(uint64_t v_n_868_){
_start:
{
double v___x_869_; 
v___x_869_ = lean_float_of_bits(v_n_868_);
return v___x_869_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numFloat___boxed(lean_object* v_n_870_){
_start:
{
uint64_t v_n_boxed_871_; double v_res_872_; lean_object* v_r_873_; 
v_n_boxed_871_ = lean_unbox_uint64(v_n_870_);
lean_dec_ref(v_n_870_);
v_res_872_ = lp_algalVerification_Algal_Expr_numFloat(v_n_boxed_871_);
v_r_873_ = lean_box_float(v_res_872_);
return v_r_873_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_admitNum(double v_f_874_){
_start:
{
uint64_t v___x_875_; lean_object* v___x_876_; 
v___x_875_ = lean_float_to_bits(v_f_874_);
v___x_876_ = lp_algalVerification_Algal_Core_Binary64_admit(v___x_875_);
return v___x_876_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_admitNum___boxed(lean_object* v_f_877_){
_start:
{
double v_f_boxed_878_; lean_object* v_res_879_; 
v_f_boxed_878_ = lean_unbox_float(v_f_877_);
lean_dec_ref(v_f_877_);
v_res_879_ = lp_algalVerification_Algal_Expr_admitNum(v_f_boxed_878_);
return v_res_879_;
}
}
static double _init_lp_algalVerification_Algal_Expr_negZeroF___closed__0(void){
_start:
{
lean_object* v___x_880_; uint8_t v___x_881_; lean_object* v___x_882_; double v___x_883_; 
v___x_880_ = lean_unsigned_to_nat(1u);
v___x_881_ = 1;
v___x_882_ = lean_unsigned_to_nat(10u);
v___x_883_ = l_Float_ofScientific(v___x_882_, v___x_881_, v___x_880_);
return v___x_883_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_negZeroF(double v_f_884_){
_start:
{
double v___x_885_; double v___x_886_; double v___x_887_; uint8_t v___x_888_; 
v___x_885_ = lean_float_once(&lp_algalVerification_Algal_Expr_negZeroF___closed__0, &lp_algalVerification_Algal_Expr_negZeroF___closed__0_once, _init_lp_algalVerification_Algal_Expr_negZeroF___closed__0);
v___x_886_ = lean_float_div(v___x_885_, v_f_884_);
v___x_887_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__0, &lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0);
v___x_888_ = lean_float_decLt(v___x_886_, v___x_887_);
return v___x_888_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_negZeroF___boxed(lean_object* v_f_889_){
_start:
{
double v_f_boxed_890_; uint8_t v_res_891_; lean_object* v_r_892_; 
v_f_boxed_890_ = lean_unbox_float(v_f_889_);
lean_dec_ref(v_f_889_);
v_res_891_ = lp_algalVerification_Algal_Expr_negZeroF(v_f_boxed_890_);
v_r_892_ = lean_box(v_res_891_);
return v_r_892_;
}
}
static double _init_lp_algalVerification_Algal_Expr_fmin___closed__0(void){
_start:
{
lean_object* v___x_893_; uint8_t v___x_894_; lean_object* v___x_895_; double v___x_896_; 
v___x_893_ = lean_unsigned_to_nat(1u);
v___x_894_ = 1;
v___x_895_ = lean_unsigned_to_nat(0u);
v___x_896_ = l_Float_ofScientific(v___x_895_, v___x_894_, v___x_893_);
return v___x_896_;
}
}
static double _init_lp_algalVerification_Algal_Expr_fmin___closed__1(void){
_start:
{
double v___x_897_; double v___x_898_; 
v___x_897_ = lean_float_once(&lp_algalVerification_Algal_Expr_fmin___closed__0, &lp_algalVerification_Algal_Expr_fmin___closed__0_once, _init_lp_algalVerification_Algal_Expr_fmin___closed__0);
v___x_898_ = lean_float_negate(v___x_897_);
return v___x_898_;
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_fmin(double v_a_899_, double v_b_900_){
_start:
{
uint8_t v___x_901_; 
v___x_901_ = lean_float_decLt(v_a_899_, v_b_900_);
if (v___x_901_ == 0)
{
uint8_t v___x_902_; 
v___x_902_ = lean_float_decLt(v_b_900_, v_a_899_);
if (v___x_902_ == 0)
{
uint8_t v___x_903_; 
v___x_903_ = lp_algalVerification_Algal_Expr_negZeroF(v_a_899_);
if (v___x_903_ == 0)
{
uint8_t v___x_906_; 
v___x_906_ = lp_algalVerification_Algal_Expr_negZeroF(v_b_900_);
if (v___x_906_ == 0)
{
return v_a_899_;
}
else
{
goto v___jp_904_;
}
}
else
{
goto v___jp_904_;
}
v___jp_904_:
{
double v___x_905_; 
v___x_905_ = lean_float_once(&lp_algalVerification_Algal_Expr_fmin___closed__1, &lp_algalVerification_Algal_Expr_fmin___closed__1_once, _init_lp_algalVerification_Algal_Expr_fmin___closed__1);
return v___x_905_;
}
}
else
{
return v_b_900_;
}
}
else
{
return v_a_899_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fmin___boxed(lean_object* v_a_907_, lean_object* v_b_908_){
_start:
{
double v_a_boxed_909_; double v_b_boxed_910_; double v_res_911_; lean_object* v_r_912_; 
v_a_boxed_909_ = lean_unbox_float(v_a_907_);
lean_dec_ref(v_a_907_);
v_b_boxed_910_ = lean_unbox_float(v_b_908_);
lean_dec_ref(v_b_908_);
v_res_911_ = lp_algalVerification_Algal_Expr_fmin(v_a_boxed_909_, v_b_boxed_910_);
v_r_912_ = lean_box_float(v_res_911_);
return v_r_912_;
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_fmax(double v_a_913_, double v_b_914_){
_start:
{
uint8_t v___x_915_; 
v___x_915_ = lean_float_decLt(v_a_913_, v_b_914_);
if (v___x_915_ == 0)
{
uint8_t v___x_916_; 
v___x_916_ = lean_float_decLt(v_b_914_, v_a_913_);
if (v___x_916_ == 0)
{
uint8_t v___x_917_; 
v___x_917_ = lp_algalVerification_Algal_Expr_negZeroF(v_a_913_);
if (v___x_917_ == 0)
{
goto v___jp_918_;
}
else
{
uint8_t v___x_922_; 
v___x_922_ = lp_algalVerification_Algal_Expr_negZeroF(v_b_914_);
if (v___x_922_ == 0)
{
goto v___jp_918_;
}
else
{
return v_a_913_;
}
}
v___jp_918_:
{
double v___x_919_; uint8_t v___x_920_; 
v___x_919_ = lean_float_once(&lp_algalVerification_Algal_Expr_itemsGetF___closed__0, &lp_algalVerification_Algal_Expr_itemsGetF___closed__0_once, _init_lp_algalVerification_Algal_Expr_itemsGetF___closed__0);
v___x_920_ = lean_float_beq(v_a_913_, v___x_919_);
if (v___x_920_ == 0)
{
return v_a_913_;
}
else
{
double v___x_921_; 
v___x_921_ = lean_float_once(&lp_algalVerification_Algal_Expr_fmin___closed__0, &lp_algalVerification_Algal_Expr_fmin___closed__0_once, _init_lp_algalVerification_Algal_Expr_fmin___closed__0);
return v___x_921_;
}
}
}
else
{
return v_a_913_;
}
}
else
{
return v_b_914_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fmax___boxed(lean_object* v_a_923_, lean_object* v_b_924_){
_start:
{
double v_a_boxed_925_; double v_b_boxed_926_; double v_res_927_; lean_object* v_r_928_; 
v_a_boxed_925_ = lean_unbox_float(v_a_923_);
lean_dec_ref(v_a_923_);
v_b_boxed_926_ = lean_unbox_float(v_b_924_);
lean_dec_ref(v_b_924_);
v_res_927_ = lp_algalVerification_Algal_Expr_fmax(v_a_boxed_925_, v_b_boxed_926_);
v_r_928_ = lean_box_float(v_res_927_);
return v_r_928_;
}
}
static double _init_lp_algalVerification_Algal_Expr_jsRound___closed__0(void){
_start:
{
lean_object* v___x_929_; uint8_t v___x_930_; lean_object* v___x_931_; double v___x_932_; 
v___x_929_ = lean_unsigned_to_nat(1u);
v___x_930_ = 1;
v___x_931_ = lean_unsigned_to_nat(5u);
v___x_932_ = l_Float_ofScientific(v___x_931_, v___x_930_, v___x_929_);
return v___x_932_;
}
}
LEAN_EXPORT double lp_algalVerification_Algal_Expr_jsRound(double v_n_933_){
_start:
{
double v_f_934_; double v___x_935_; double v___x_936_; uint8_t v___x_937_; 
v_f_934_ = floor(v_n_933_);
v___x_935_ = lean_float_sub(v_n_933_, v_f_934_);
v___x_936_ = lean_float_once(&lp_algalVerification_Algal_Expr_jsRound___closed__0, &lp_algalVerification_Algal_Expr_jsRound___closed__0_once, _init_lp_algalVerification_Algal_Expr_jsRound___closed__0);
v___x_937_ = lean_float_decLt(v___x_935_, v___x_936_);
if (v___x_937_ == 0)
{
double v___x_938_; double v___x_939_; 
v___x_938_ = lean_float_once(&lp_algalVerification_Algal_Expr_negZeroF___closed__0, &lp_algalVerification_Algal_Expr_negZeroF___closed__0_once, _init_lp_algalVerification_Algal_Expr_negZeroF___closed__0);
v___x_939_ = lean_float_add(v_f_934_, v___x_938_);
return v___x_939_;
}
else
{
return v_f_934_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_jsRound___boxed(lean_object* v_n_940_){
_start:
{
double v_n_boxed_941_; double v_res_942_; lean_object* v_r_943_; 
v_n_boxed_941_ = lean_unbox_float(v_n_940_);
lean_dec_ref(v_n_940_);
v_res_942_ = lp_algalVerification_Algal_Expr_jsRound(v_n_boxed_941_);
v_r_943_ = lean_box_float(v_res_942_);
return v_r_943_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countItemsNodes(lean_object* v_x_944_){
_start:
{
if (lean_obj_tag(v_x_944_) == 0)
{
lean_object* v___x_945_; 
v___x_945_ = lean_unsigned_to_nat(0u);
return v___x_945_;
}
else
{
lean_object* v_value_946_; lean_object* v_rest_947_; lean_object* v___x_948_; lean_object* v___x_949_; lean_object* v___x_950_; 
v_value_946_ = lean_ctor_get(v_x_944_, 0);
v_rest_947_ = lean_ctor_get(v_x_944_, 1);
v___x_948_ = lp_algalVerification_Algal_Expr_countNodes(v_value_946_);
v___x_949_ = lp_algalVerification_Algal_Expr_countItemsNodes(v_rest_947_);
v___x_950_ = lean_nat_add(v___x_948_, v___x_949_);
lean_dec(v___x_949_);
lean_dec(v___x_948_);
return v___x_950_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countNodes(lean_object* v_x_951_){
_start:
{
switch(lean_obj_tag(v_x_951_))
{
case 0:
{
lean_object* v___x_952_; 
v___x_952_ = lean_unsigned_to_nat(1u);
return v___x_952_;
}
case 4:
{
lean_object* v_values_953_; lean_object* v___x_954_; lean_object* v___x_955_; lean_object* v___x_956_; 
v_values_953_ = lean_ctor_get(v_x_951_, 0);
v___x_954_ = lean_unsigned_to_nat(1u);
v___x_955_ = lp_algalVerification_Algal_Expr_countItemsNodes(v_values_953_);
v___x_956_ = lean_nat_add(v___x_954_, v___x_955_);
lean_dec(v___x_955_);
return v___x_956_;
}
case 5:
{
lean_object* v_fields_957_; lean_object* v___x_958_; lean_object* v___x_959_; lean_object* v___x_960_; 
v_fields_957_ = lean_ctor_get(v_x_951_, 0);
v___x_958_ = lean_unsigned_to_nat(1u);
v___x_959_ = lp_algalVerification_Algal_Expr_countFieldsNodes(v_fields_957_);
v___x_960_ = lean_nat_add(v___x_958_, v___x_959_);
lean_dec(v___x_959_);
return v___x_960_;
}
default: 
{
lean_object* v___x_961_; 
v___x_961_ = lean_unsigned_to_nat(1u);
return v___x_961_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countFieldsNodes(lean_object* v_x_962_){
_start:
{
if (lean_obj_tag(v_x_962_) == 0)
{
lean_object* v___x_963_; 
v___x_963_ = lean_unsigned_to_nat(0u);
return v___x_963_;
}
else
{
lean_object* v_value_964_; lean_object* v_rest_965_; lean_object* v___x_966_; lean_object* v___x_967_; lean_object* v___x_968_; 
v_value_964_ = lean_ctor_get(v_x_962_, 1);
v_rest_965_ = lean_ctor_get(v_x_962_, 2);
v___x_966_ = lp_algalVerification_Algal_Expr_countNodes(v_value_964_);
v___x_967_ = lp_algalVerification_Algal_Expr_countFieldsNodes(v_rest_965_);
v___x_968_ = lean_nat_add(v___x_966_, v___x_967_);
lean_dec(v___x_967_);
lean_dec(v___x_966_);
return v___x_968_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countFieldsNodes___boxed(lean_object* v_x_969_){
_start:
{
lean_object* v_res_970_; 
v_res_970_ = lp_algalVerification_Algal_Expr_countFieldsNodes(v_x_969_);
lean_dec(v_x_969_);
return v_res_970_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countItemsNodes___boxed(lean_object* v_x_971_){
_start:
{
lean_object* v_res_972_; 
v_res_972_ = lp_algalVerification_Algal_Expr_countItemsNodes(v_x_971_);
lean_dec(v_x_971_);
return v_res_972_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_countNodes___boxed(lean_object* v_x_973_){
_start:
{
lean_object* v_res_974_; 
v_res_974_ = lp_algalVerification_Algal_Expr_countNodes(v_x_973_);
lean_dec(v_x_973_);
return v_res_974_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDepth(lean_object* v_x_975_){
_start:
{
if (lean_obj_tag(v_x_975_) == 0)
{
lean_object* v___x_976_; 
v___x_976_ = lean_unsigned_to_nat(0u);
return v___x_976_;
}
else
{
lean_object* v_value_977_; lean_object* v_rest_978_; lean_object* v___x_979_; lean_object* v___x_980_; uint8_t v___x_981_; 
v_value_977_ = lean_ctor_get(v_x_975_, 0);
v_rest_978_ = lean_ctor_get(v_x_975_, 1);
v___x_979_ = lp_algalVerification_Algal_Expr_valueDepth(v_value_977_);
v___x_980_ = lp_algalVerification_Algal_Expr_itemsDepth(v_rest_978_);
v___x_981_ = lean_nat_dec_le(v___x_979_, v___x_980_);
if (v___x_981_ == 0)
{
lean_dec(v___x_980_);
return v___x_979_;
}
else
{
lean_dec(v___x_979_);
return v___x_980_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueDepth(lean_object* v_x_982_){
_start:
{
switch(lean_obj_tag(v_x_982_))
{
case 0:
{
lean_object* v___x_983_; 
v___x_983_ = lean_unsigned_to_nat(0u);
return v___x_983_;
}
case 4:
{
lean_object* v_values_984_; lean_object* v___x_985_; lean_object* v___x_986_; lean_object* v___x_987_; 
v_values_984_ = lean_ctor_get(v_x_982_, 0);
v___x_985_ = lean_unsigned_to_nat(1u);
v___x_986_ = lp_algalVerification_Algal_Expr_itemsDepth(v_values_984_);
v___x_987_ = lean_nat_add(v___x_985_, v___x_986_);
lean_dec(v___x_986_);
return v___x_987_;
}
case 5:
{
lean_object* v_fields_988_; lean_object* v___x_989_; lean_object* v___x_990_; lean_object* v___x_991_; 
v_fields_988_ = lean_ctor_get(v_x_982_, 0);
v___x_989_ = lean_unsigned_to_nat(1u);
v___x_990_ = lp_algalVerification_Algal_Expr_fieldsDepth(v_fields_988_);
v___x_991_ = lean_nat_add(v___x_989_, v___x_990_);
lean_dec(v___x_990_);
return v___x_991_;
}
default: 
{
lean_object* v___x_992_; 
v___x_992_ = lean_unsigned_to_nat(0u);
return v___x_992_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsDepth(lean_object* v_x_993_){
_start:
{
if (lean_obj_tag(v_x_993_) == 0)
{
lean_object* v___x_994_; 
v___x_994_ = lean_unsigned_to_nat(0u);
return v___x_994_;
}
else
{
lean_object* v_value_995_; lean_object* v_rest_996_; lean_object* v___x_997_; lean_object* v___x_998_; uint8_t v___x_999_; 
v_value_995_ = lean_ctor_get(v_x_993_, 1);
v_rest_996_ = lean_ctor_get(v_x_993_, 2);
v___x_997_ = lp_algalVerification_Algal_Expr_valueDepth(v_value_995_);
v___x_998_ = lp_algalVerification_Algal_Expr_fieldsDepth(v_rest_996_);
v___x_999_ = lean_nat_dec_le(v___x_997_, v___x_998_);
if (v___x_999_ == 0)
{
lean_dec(v___x_998_);
return v___x_997_;
}
else
{
lean_dec(v___x_997_);
return v___x_998_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsDepth___boxed(lean_object* v_x_1000_){
_start:
{
lean_object* v_res_1001_; 
v_res_1001_ = lp_algalVerification_Algal_Expr_fieldsDepth(v_x_1000_);
lean_dec(v_x_1000_);
return v_res_1001_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsDepth___boxed(lean_object* v_x_1002_){
_start:
{
lean_object* v_res_1003_; 
v_res_1003_ = lp_algalVerification_Algal_Expr_itemsDepth(v_x_1002_);
lean_dec(v_x_1002_);
return v_res_1003_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueDepth___boxed(lean_object* v_x_1004_){
_start:
{
lean_object* v_res_1005_; 
v_res_1005_ = lp_algalVerification_Algal_Expr_valueDepth(v_x_1004_);
lean_dec(v_x_1004_);
return v_res_1005_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_stringBytes(lean_object* v_s_1006_){
_start:
{
lean_object* v___x_1007_; lean_object* v___x_1008_; 
v___x_1007_ = lp_algalVerification_Algal_Core_JsonString_quote(v_s_1006_);
v___x_1008_ = lean_string_utf8_byte_size(v___x_1007_);
lean_dec_ref(v___x_1007_);
return v___x_1008_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_numberByteBound(void){
_start:
{
lean_object* v___x_1009_; 
v___x_1009_ = lean_unsigned_to_nat(24u);
return v___x_1009_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_fieldsByteCount(lean_object* v_x_1010_){
_start:
{
if (lean_obj_tag(v_x_1010_) == 0)
{
lean_object* v___x_1011_; 
v___x_1011_ = lean_unsigned_to_nat(0u);
return v___x_1011_;
}
else
{
lean_object* v_key_1012_; lean_object* v_value_1013_; lean_object* v_rest_1014_; lean_object* v___x_1015_; lean_object* v___x_1016_; lean_object* v___x_1017_; lean_object* v___x_1018_; lean_object* v___x_1019_; lean_object* v___x_1020_; lean_object* v___x_1021_; 
v_key_1012_ = lean_ctor_get(v_x_1010_, 0);
lean_inc_ref(v_key_1012_);
v_value_1013_ = lean_ctor_get(v_x_1010_, 1);
lean_inc(v_value_1013_);
v_rest_1014_ = lean_ctor_get(v_x_1010_, 2);
lean_inc(v_rest_1014_);
lean_dec_ref_known(v_x_1010_, 3);
v___x_1015_ = lp_algalVerification_Algal_Expr_stringBytes(v_key_1012_);
v___x_1016_ = lean_unsigned_to_nat(1u);
v___x_1017_ = lean_nat_add(v___x_1015_, v___x_1016_);
lean_dec(v___x_1015_);
v___x_1018_ = lp_algalVerification_Algal_Expr_valueByteCount(v_value_1013_);
v___x_1019_ = lean_nat_add(v___x_1017_, v___x_1018_);
lean_dec(v___x_1018_);
lean_dec(v___x_1017_);
v___x_1020_ = lp_algalVerification_Algal_Expr_fieldsByteCount(v_rest_1014_);
v___x_1021_ = lean_nat_add(v___x_1019_, v___x_1020_);
lean_dec(v___x_1020_);
lean_dec(v___x_1019_);
return v___x_1021_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueByteCount(lean_object* v_x_1022_){
_start:
{
switch(lean_obj_tag(v_x_1022_))
{
case 0:
{
lean_object* v___x_1023_; 
v___x_1023_ = lean_unsigned_to_nat(4u);
return v___x_1023_;
}
case 1:
{
uint8_t v_value_1024_; 
v_value_1024_ = lean_ctor_get_uint8(v_x_1022_, 0);
lean_dec_ref_known(v_x_1022_, 0);
if (v_value_1024_ == 0)
{
lean_object* v___x_1025_; 
v___x_1025_ = lean_unsigned_to_nat(5u);
return v___x_1025_;
}
else
{
lean_object* v___x_1026_; 
v___x_1026_ = lean_unsigned_to_nat(4u);
return v___x_1026_;
}
}
case 2:
{
lean_object* v___x_1027_; 
lean_dec_ref_known(v_x_1022_, 0);
v___x_1027_ = lean_unsigned_to_nat(24u);
return v___x_1027_;
}
case 3:
{
lean_object* v_value_1028_; lean_object* v___x_1029_; 
v_value_1028_ = lean_ctor_get(v_x_1022_, 0);
lean_inc_ref(v_value_1028_);
lean_dec_ref_known(v_x_1022_, 1);
v___x_1029_ = lp_algalVerification_Algal_Expr_stringBytes(v_value_1028_);
return v___x_1029_;
}
case 4:
{
lean_object* v_values_1030_; lean_object* v___x_1031_; lean_object* v___x_1032_; lean_object* v___x_1033_; lean_object* v___x_1034_; lean_object* v___x_1035_; lean_object* v___x_1036_; lean_object* v___x_1037_; 
v_values_1030_ = lean_ctor_get(v_x_1022_, 0);
lean_inc(v_values_1030_);
lean_dec_ref_known(v_x_1022_, 1);
v___x_1031_ = lean_unsigned_to_nat(2u);
v___x_1032_ = lp_algalVerification_Algal_Expr_itemsLength(v_values_1030_);
v___x_1033_ = lean_unsigned_to_nat(1u);
v___x_1034_ = lean_nat_sub(v___x_1032_, v___x_1033_);
lean_dec(v___x_1032_);
v___x_1035_ = lean_nat_add(v___x_1031_, v___x_1034_);
lean_dec(v___x_1034_);
v___x_1036_ = lp_algalVerification_Algal_Expr_itemsByteCount(v_values_1030_);
v___x_1037_ = lean_nat_add(v___x_1035_, v___x_1036_);
lean_dec(v___x_1036_);
lean_dec(v___x_1035_);
return v___x_1037_;
}
default: 
{
lean_object* v_fields_1038_; lean_object* v___x_1039_; lean_object* v___x_1040_; lean_object* v___x_1041_; lean_object* v___x_1042_; lean_object* v___x_1043_; lean_object* v___x_1044_; lean_object* v___x_1045_; 
v_fields_1038_ = lean_ctor_get(v_x_1022_, 0);
lean_inc(v_fields_1038_);
lean_dec_ref_known(v_x_1022_, 1);
v___x_1039_ = lean_unsigned_to_nat(2u);
v___x_1040_ = lp_algalVerification_Algal_Expr_fieldsLength(v_fields_1038_);
v___x_1041_ = lean_unsigned_to_nat(1u);
v___x_1042_ = lean_nat_sub(v___x_1040_, v___x_1041_);
lean_dec(v___x_1040_);
v___x_1043_ = lean_nat_add(v___x_1039_, v___x_1042_);
lean_dec(v___x_1042_);
v___x_1044_ = lp_algalVerification_Algal_Expr_fieldsByteCount(v_fields_1038_);
v___x_1045_ = lean_nat_add(v___x_1043_, v___x_1044_);
lean_dec(v___x_1044_);
lean_dec(v___x_1043_);
return v___x_1045_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_itemsByteCount(lean_object* v_x_1046_){
_start:
{
if (lean_obj_tag(v_x_1046_) == 0)
{
lean_object* v___x_1047_; 
v___x_1047_ = lean_unsigned_to_nat(0u);
return v___x_1047_;
}
else
{
lean_object* v_value_1048_; lean_object* v_rest_1049_; lean_object* v___x_1050_; lean_object* v___x_1051_; lean_object* v___x_1052_; 
v_value_1048_ = lean_ctor_get(v_x_1046_, 0);
lean_inc(v_value_1048_);
v_rest_1049_ = lean_ctor_get(v_x_1046_, 1);
lean_inc(v_rest_1049_);
lean_dec_ref_known(v_x_1046_, 2);
v___x_1050_ = lp_algalVerification_Algal_Expr_valueByteCount(v_value_1048_);
v___x_1051_ = lp_algalVerification_Algal_Expr_itemsByteCount(v_rest_1049_);
v___x_1052_ = lean_nat_add(v___x_1050_, v___x_1051_);
lean_dec(v___x_1051_);
lean_dec(v___x_1050_);
return v___x_1052_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__1(void){
_start:
{
lean_object* v___x_1054_; lean_object* v___x_1055_; lean_object* v___x_1056_; 
v___x_1054_ = lean_unsigned_to_nat(262144u);
v___x_1055_ = ((lean_object*)(lp_algalVerification_Algal_Expr_addValueBytes___closed__0));
v___x_1056_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1055_, v___x_1054_);
return v___x_1056_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__2(void){
_start:
{
lean_object* v___x_1057_; lean_object* v___x_1058_; 
v___x_1057_ = lean_obj_once(&lp_algalVerification_Algal_Expr_addValueBytes___closed__1, &lp_algalVerification_Algal_Expr_addValueBytes___closed__1_once, _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__1);
v___x_1058_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1058_, 0, v___x_1057_);
return v___x_1058_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_addValueBytes(lean_object* v_total_1059_, lean_object* v_extra_1060_){
_start:
{
lean_object* v___x_1061_; lean_object* v___x_1062_; uint8_t v___x_1063_; 
v___x_1061_ = lean_unsigned_to_nat(262144u);
v___x_1062_ = lean_nat_add(v_total_1059_, v_extra_1060_);
v___x_1063_ = lean_nat_dec_lt(v___x_1061_, v___x_1062_);
if (v___x_1063_ == 0)
{
lean_object* v___x_1064_; 
v___x_1064_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1064_, 0, v___x_1062_);
return v___x_1064_;
}
else
{
lean_object* v___x_1065_; 
lean_dec(v___x_1062_);
v___x_1065_ = lean_obj_once(&lp_algalVerification_Algal_Expr_addValueBytes___closed__2, &lp_algalVerification_Algal_Expr_addValueBytes___closed__2_once, _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__2);
return v___x_1065_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_addValueBytes___boxed(lean_object* v_total_1066_, lean_object* v_extra_1067_){
_start:
{
lean_object* v_res_1068_; 
v_res_1068_ = lp_algalVerification_Algal_Expr_addValueBytes(v_total_1066_, v_extra_1067_);
lean_dec(v_extra_1067_);
lean_dec(v_total_1066_);
return v_res_1068_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_bytesFields___closed__1(void){
_start:
{
lean_object* v___x_1076_; lean_object* v___x_1077_; lean_object* v___x_1078_; 
v___x_1076_ = lean_unsigned_to_nat(65536u);
v___x_1077_ = ((lean_object*)(lp_algalVerification_Algal_Expr_bytesFields___closed__0));
v___x_1078_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1077_, v___x_1076_);
return v___x_1078_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_bytesFields___closed__2(void){
_start:
{
lean_object* v___x_1079_; lean_object* v___x_1080_; 
v___x_1079_ = lean_obj_once(&lp_algalVerification_Algal_Expr_bytesFields___closed__1, &lp_algalVerification_Algal_Expr_bytesFields___closed__1_once, _init_lp_algalVerification_Algal_Expr_bytesFields___closed__1);
v___x_1080_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1080_, 0, v___x_1079_);
return v___x_1080_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__4(void){
_start:
{
lean_object* v___x_1082_; lean_object* v___x_1083_; lean_object* v___x_1084_; 
v___x_1082_ = lean_unsigned_to_nat(1024u);
v___x_1083_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__3));
v___x_1084_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1083_, v___x_1082_);
return v___x_1084_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__5(void){
_start:
{
lean_object* v___x_1085_; lean_object* v___x_1086_; 
v___x_1085_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__4, &lp_algalVerification_Algal_Expr_valueBytes___closed__4_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__4);
v___x_1086_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1086_, 0, v___x_1085_);
return v___x_1086_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesFields(lean_object* v_depth_1087_, lean_object* v_acc_1088_, lean_object* v_x_1089_){
_start:
{
if (lean_obj_tag(v_x_1089_) == 0)
{
lean_object* v___x_1090_; 
v___x_1090_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1090_, 0, v_acc_1088_);
return v___x_1090_;
}
else
{
lean_object* v_key_1091_; lean_object* v_value_1092_; lean_object* v_rest_1093_; lean_object* v___x_1094_; lean_object* v___x_1095_; uint8_t v___x_1096_; 
v_key_1091_ = lean_ctor_get(v_x_1089_, 0);
lean_inc_ref(v_key_1091_);
v_value_1092_ = lean_ctor_get(v_x_1089_, 1);
lean_inc(v_value_1092_);
v_rest_1093_ = lean_ctor_get(v_x_1089_, 2);
lean_inc(v_rest_1093_);
lean_dec_ref_known(v_x_1089_, 3);
v___x_1094_ = lean_unsigned_to_nat(65536u);
v___x_1095_ = lean_string_utf8_byte_size(v_key_1091_);
v___x_1096_ = lean_nat_dec_lt(v___x_1094_, v___x_1095_);
if (v___x_1096_ == 0)
{
lean_object* v___x_1097_; lean_object* v___x_1098_; lean_object* v___x_1099_; lean_object* v___x_1100_; 
v___x_1097_ = lp_algalVerification_Algal_Expr_stringBytes(v_key_1091_);
v___x_1098_ = lean_unsigned_to_nat(1u);
v___x_1099_ = lean_nat_add(v___x_1097_, v___x_1098_);
lean_dec(v___x_1097_);
v___x_1100_ = lp_algalVerification_Algal_Expr_addValueBytes(v_acc_1088_, v___x_1099_);
lean_dec(v___x_1099_);
lean_dec(v_acc_1088_);
if (lean_obj_tag(v___x_1100_) == 0)
{
lean_dec(v_rest_1093_);
lean_dec(v_value_1092_);
return v___x_1100_;
}
else
{
lean_object* v_a_1101_; lean_object* v___x_1102_; 
v_a_1101_ = lean_ctor_get(v___x_1100_, 0);
lean_inc(v_a_1101_);
lean_dec_ref_known(v___x_1100_, 1);
v___x_1102_ = lp_algalVerification_Algal_Expr_valueBytes(v_value_1092_, v_depth_1087_);
if (lean_obj_tag(v___x_1102_) == 0)
{
lean_dec(v_a_1101_);
lean_dec(v_rest_1093_);
return v___x_1102_;
}
else
{
lean_object* v_a_1103_; lean_object* v___x_1104_; 
v_a_1103_ = lean_ctor_get(v___x_1102_, 0);
lean_inc(v_a_1103_);
lean_dec_ref_known(v___x_1102_, 1);
v___x_1104_ = lp_algalVerification_Algal_Expr_addValueBytes(v_a_1101_, v_a_1103_);
lean_dec(v_a_1103_);
lean_dec(v_a_1101_);
if (lean_obj_tag(v___x_1104_) == 0)
{
lean_dec(v_rest_1093_);
return v___x_1104_;
}
else
{
lean_object* v_a_1105_; 
v_a_1105_ = lean_ctor_get(v___x_1104_, 0);
lean_inc(v_a_1105_);
lean_dec_ref_known(v___x_1104_, 1);
v_acc_1088_ = v_a_1105_;
v_x_1089_ = v_rest_1093_;
goto _start;
}
}
}
}
else
{
lean_object* v___x_1107_; 
lean_dec(v_rest_1093_);
lean_dec(v_value_1092_);
lean_dec_ref(v_key_1091_);
lean_dec(v_acc_1088_);
v___x_1107_ = lean_obj_once(&lp_algalVerification_Algal_Expr_bytesFields___closed__2, &lp_algalVerification_Algal_Expr_bytesFields___closed__2_once, _init_lp_algalVerification_Algal_Expr_bytesFields___closed__2);
return v___x_1107_;
}
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__7(void){
_start:
{
lean_object* v___x_1109_; lean_object* v___x_1110_; lean_object* v___x_1111_; 
v___x_1109_ = lean_unsigned_to_nat(256u);
v___x_1110_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__6));
v___x_1111_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1110_, v___x_1109_);
return v___x_1111_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__8(void){
_start:
{
lean_object* v___x_1112_; lean_object* v___x_1113_; 
v___x_1112_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__7, &lp_algalVerification_Algal_Expr_valueBytes___closed__7_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__7);
v___x_1113_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1113_, 0, v___x_1112_);
return v___x_1113_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__10(void){
_start:
{
lean_object* v___x_1115_; lean_object* v___x_1116_; lean_object* v___x_1117_; 
v___x_1115_ = lean_unsigned_to_nat(32u);
v___x_1116_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__9));
v___x_1117_ = lp_algalVerification_Algal_Expr_errBounds(v___x_1116_, v___x_1115_);
return v___x_1117_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Expr_valueBytes___closed__11(void){
_start:
{
lean_object* v___x_1118_; lean_object* v___x_1119_; 
v___x_1118_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__10, &lp_algalVerification_Algal_Expr_valueBytes___closed__10_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__10);
v___x_1119_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_1119_, 0, v___x_1118_);
return v___x_1119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueBytes(lean_object* v_v_1120_, lean_object* v_depth_1121_){
_start:
{
lean_object* v___x_1122_; uint8_t v___x_1123_; 
v___x_1122_ = lean_unsigned_to_nat(32u);
v___x_1123_ = lean_nat_dec_lt(v___x_1122_, v_depth_1121_);
if (v___x_1123_ == 0)
{
switch(lean_obj_tag(v_v_1120_))
{
case 0:
{
lean_object* v___x_1124_; 
v___x_1124_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__0));
return v___x_1124_;
}
case 1:
{
uint8_t v_value_1125_; 
v_value_1125_ = lean_ctor_get_uint8(v_v_1120_, 0);
lean_dec_ref_known(v_v_1120_, 0);
if (v_value_1125_ == 0)
{
lean_object* v___x_1126_; 
v___x_1126_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__1));
return v___x_1126_;
}
else
{
lean_object* v___x_1127_; 
v___x_1127_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__0));
return v___x_1127_;
}
}
case 2:
{
lean_object* v___x_1128_; 
lean_dec_ref_known(v_v_1120_, 0);
v___x_1128_ = ((lean_object*)(lp_algalVerification_Algal_Expr_valueBytes___closed__2));
return v___x_1128_;
}
case 3:
{
lean_object* v_value_1129_; lean_object* v___x_1131_; uint8_t v_isShared_1132_; uint8_t v_isSharedCheck_1141_; 
v_value_1129_ = lean_ctor_get(v_v_1120_, 0);
v_isSharedCheck_1141_ = !lean_is_exclusive(v_v_1120_);
if (v_isSharedCheck_1141_ == 0)
{
v___x_1131_ = v_v_1120_;
v_isShared_1132_ = v_isSharedCheck_1141_;
goto v_resetjp_1130_;
}
else
{
lean_inc(v_value_1129_);
lean_dec(v_v_1120_);
v___x_1131_ = lean_box(0);
v_isShared_1132_ = v_isSharedCheck_1141_;
goto v_resetjp_1130_;
}
v_resetjp_1130_:
{
lean_object* v___x_1133_; lean_object* v___x_1134_; uint8_t v___x_1135_; 
v___x_1133_ = lean_unsigned_to_nat(65536u);
v___x_1134_ = lean_string_utf8_byte_size(v_value_1129_);
v___x_1135_ = lean_nat_dec_lt(v___x_1133_, v___x_1134_);
if (v___x_1135_ == 0)
{
lean_object* v___x_1136_; lean_object* v___x_1138_; 
v___x_1136_ = lp_algalVerification_Algal_Expr_stringBytes(v_value_1129_);
if (v_isShared_1132_ == 0)
{
lean_ctor_set_tag(v___x_1131_, 1);
lean_ctor_set(v___x_1131_, 0, v___x_1136_);
v___x_1138_ = v___x_1131_;
goto v_reusejp_1137_;
}
else
{
lean_object* v_reuseFailAlloc_1139_; 
v_reuseFailAlloc_1139_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1139_, 0, v___x_1136_);
v___x_1138_ = v_reuseFailAlloc_1139_;
goto v_reusejp_1137_;
}
v_reusejp_1137_:
{
return v___x_1138_;
}
}
else
{
lean_object* v___x_1140_; 
lean_del_object(v___x_1131_);
lean_dec_ref(v_value_1129_);
v___x_1140_ = lean_obj_once(&lp_algalVerification_Algal_Expr_bytesFields___closed__2, &lp_algalVerification_Algal_Expr_bytesFields___closed__2_once, _init_lp_algalVerification_Algal_Expr_bytesFields___closed__2);
return v___x_1140_;
}
}
}
case 4:
{
lean_object* v_values_1142_; lean_object* v___x_1143_; lean_object* v___x_1144_; uint8_t v___x_1145_; 
v_values_1142_ = lean_ctor_get(v_v_1120_, 0);
lean_inc(v_values_1142_);
lean_dec_ref_known(v_v_1120_, 1);
v___x_1143_ = lean_unsigned_to_nat(1024u);
v___x_1144_ = lp_algalVerification_Algal_Expr_itemsLength(v_values_1142_);
v___x_1145_ = lean_nat_dec_lt(v___x_1143_, v___x_1144_);
if (v___x_1145_ == 0)
{
lean_object* v___x_1146_; lean_object* v___x_1147_; lean_object* v___x_1148_; lean_object* v___x_1149_; lean_object* v___x_1150_; lean_object* v___x_1151_; 
v___x_1146_ = lean_unsigned_to_nat(1u);
v___x_1147_ = lean_nat_add(v_depth_1121_, v___x_1146_);
v___x_1148_ = lean_unsigned_to_nat(2u);
v___x_1149_ = lean_nat_add(v___x_1148_, v___x_1144_);
lean_dec(v___x_1144_);
v___x_1150_ = lean_nat_sub(v___x_1149_, v___x_1146_);
lean_dec(v___x_1149_);
v___x_1151_ = lp_algalVerification_Algal_Expr_bytesItems(v___x_1147_, v___x_1150_, v_values_1142_);
lean_dec(v___x_1147_);
if (lean_obj_tag(v___x_1151_) == 0)
{
return v___x_1151_;
}
else
{
lean_object* v_a_1152_; lean_object* v___x_1153_; uint8_t v___x_1154_; 
v_a_1152_ = lean_ctor_get(v___x_1151_, 0);
lean_inc(v_a_1152_);
v___x_1153_ = lean_unsigned_to_nat(262144u);
v___x_1154_ = lean_nat_dec_lt(v___x_1153_, v_a_1152_);
lean_dec(v_a_1152_);
if (v___x_1154_ == 0)
{
return v___x_1151_;
}
else
{
lean_object* v___x_1155_; 
lean_dec_ref_known(v___x_1151_, 1);
v___x_1155_ = lean_obj_once(&lp_algalVerification_Algal_Expr_addValueBytes___closed__2, &lp_algalVerification_Algal_Expr_addValueBytes___closed__2_once, _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__2);
return v___x_1155_;
}
}
}
else
{
lean_object* v___x_1156_; 
lean_dec(v___x_1144_);
lean_dec(v_values_1142_);
v___x_1156_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__5, &lp_algalVerification_Algal_Expr_valueBytes___closed__5_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__5);
return v___x_1156_;
}
}
default: 
{
lean_object* v_fields_1157_; lean_object* v___x_1158_; lean_object* v___x_1159_; uint8_t v___x_1160_; 
v_fields_1157_ = lean_ctor_get(v_v_1120_, 0);
lean_inc(v_fields_1157_);
lean_dec_ref_known(v_v_1120_, 1);
v___x_1158_ = lean_unsigned_to_nat(256u);
v___x_1159_ = lp_algalVerification_Algal_Expr_fieldsLength(v_fields_1157_);
v___x_1160_ = lean_nat_dec_lt(v___x_1158_, v___x_1159_);
if (v___x_1160_ == 0)
{
lean_object* v___x_1161_; lean_object* v___x_1162_; lean_object* v___x_1163_; lean_object* v___x_1164_; lean_object* v___x_1165_; lean_object* v___x_1166_; 
v___x_1161_ = lean_unsigned_to_nat(1u);
v___x_1162_ = lean_nat_add(v_depth_1121_, v___x_1161_);
v___x_1163_ = lean_unsigned_to_nat(2u);
v___x_1164_ = lean_nat_add(v___x_1163_, v___x_1159_);
lean_dec(v___x_1159_);
v___x_1165_ = lean_nat_sub(v___x_1164_, v___x_1161_);
lean_dec(v___x_1164_);
v___x_1166_ = lp_algalVerification_Algal_Expr_bytesFields(v___x_1162_, v___x_1165_, v_fields_1157_);
lean_dec(v___x_1162_);
if (lean_obj_tag(v___x_1166_) == 0)
{
return v___x_1166_;
}
else
{
lean_object* v_a_1167_; lean_object* v___x_1168_; uint8_t v___x_1169_; 
v_a_1167_ = lean_ctor_get(v___x_1166_, 0);
lean_inc(v_a_1167_);
v___x_1168_ = lean_unsigned_to_nat(262144u);
v___x_1169_ = lean_nat_dec_lt(v___x_1168_, v_a_1167_);
lean_dec(v_a_1167_);
if (v___x_1169_ == 0)
{
return v___x_1166_;
}
else
{
lean_object* v___x_1170_; 
lean_dec_ref_known(v___x_1166_, 1);
v___x_1170_ = lean_obj_once(&lp_algalVerification_Algal_Expr_addValueBytes___closed__2, &lp_algalVerification_Algal_Expr_addValueBytes___closed__2_once, _init_lp_algalVerification_Algal_Expr_addValueBytes___closed__2);
return v___x_1170_;
}
}
}
else
{
lean_object* v___x_1171_; 
lean_dec(v___x_1159_);
lean_dec(v_fields_1157_);
v___x_1171_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__8, &lp_algalVerification_Algal_Expr_valueBytes___closed__8_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__8);
return v___x_1171_;
}
}
}
}
else
{
lean_object* v___x_1172_; 
lean_dec(v_v_1120_);
v___x_1172_ = lean_obj_once(&lp_algalVerification_Algal_Expr_valueBytes___closed__11, &lp_algalVerification_Algal_Expr_valueBytes___closed__11_once, _init_lp_algalVerification_Algal_Expr_valueBytes___closed__11);
return v___x_1172_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesItems(lean_object* v_depth_1173_, lean_object* v_acc_1174_, lean_object* v_x_1175_){
_start:
{
if (lean_obj_tag(v_x_1175_) == 0)
{
lean_object* v___x_1176_; 
v___x_1176_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1176_, 0, v_acc_1174_);
return v___x_1176_;
}
else
{
lean_object* v_value_1177_; lean_object* v_rest_1178_; lean_object* v___x_1179_; 
v_value_1177_ = lean_ctor_get(v_x_1175_, 0);
lean_inc(v_value_1177_);
v_rest_1178_ = lean_ctor_get(v_x_1175_, 1);
lean_inc(v_rest_1178_);
lean_dec_ref_known(v_x_1175_, 2);
v___x_1179_ = lp_algalVerification_Algal_Expr_valueBytes(v_value_1177_, v_depth_1173_);
if (lean_obj_tag(v___x_1179_) == 0)
{
lean_dec(v_rest_1178_);
lean_dec(v_acc_1174_);
return v___x_1179_;
}
else
{
lean_object* v_a_1180_; lean_object* v___x_1181_; 
v_a_1180_ = lean_ctor_get(v___x_1179_, 0);
lean_inc(v_a_1180_);
lean_dec_ref_known(v___x_1179_, 1);
v___x_1181_ = lp_algalVerification_Algal_Expr_addValueBytes(v_acc_1174_, v_a_1180_);
lean_dec(v_a_1180_);
lean_dec(v_acc_1174_);
if (lean_obj_tag(v___x_1181_) == 0)
{
lean_dec(v_rest_1178_);
return v___x_1181_;
}
else
{
lean_object* v_a_1182_; 
v_a_1182_ = lean_ctor_get(v___x_1181_, 0);
lean_inc(v_a_1182_);
lean_dec_ref_known(v___x_1181_, 1);
v_acc_1174_ = v_a_1182_;
v_x_1175_ = v_rest_1178_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesItems___boxed(lean_object* v_depth_1184_, lean_object* v_acc_1185_, lean_object* v_x_1186_){
_start:
{
lean_object* v_res_1187_; 
v_res_1187_ = lp_algalVerification_Algal_Expr_bytesItems(v_depth_1184_, v_acc_1185_, v_x_1186_);
lean_dec(v_depth_1184_);
return v_res_1187_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_bytesFields___boxed(lean_object* v_depth_1188_, lean_object* v_acc_1189_, lean_object* v_x_1190_){
_start:
{
lean_object* v_res_1191_; 
v_res_1191_ = lp_algalVerification_Algal_Expr_bytesFields(v_depth_1188_, v_acc_1189_, v_x_1190_);
lean_dec(v_depth_1188_);
return v_res_1191_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_valueBytes___boxed(lean_object* v_v_1192_, lean_object* v_depth_1193_){
_start:
{
lean_object* v_res_1194_; 
v_res_1194_ = lp_algalVerification_Algal_Expr_valueBytes(v_v_1192_, v_depth_1193_);
lean_dec(v_depth_1193_);
return v_res_1194_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_checkValue(lean_object* v_v_1195_){
_start:
{
lean_object* v___x_1196_; lean_object* v___x_1197_; 
v___x_1196_ = lean_unsigned_to_nat(0u);
v___x_1197_ = lp_algalVerification_Algal_Expr_valueBytes(v_v_1195_, v___x_1196_);
return v___x_1197_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envBytes_spec__0(lean_object* v_x_1198_, lean_object* v_x_1199_){
_start:
{
if (lean_obj_tag(v_x_1199_) == 0)
{
return v_x_1198_;
}
else
{
lean_object* v_head_1200_; lean_object* v_tail_1201_; lean_object* v_fst_1202_; lean_object* v_snd_1203_; lean_object* v___x_1204_; lean_object* v___x_1205_; lean_object* v___x_1206_; lean_object* v___x_1207_; lean_object* v___x_1208_; lean_object* v___x_1209_; 
v_head_1200_ = lean_ctor_get(v_x_1199_, 0);
lean_inc(v_head_1200_);
v_tail_1201_ = lean_ctor_get(v_x_1199_, 1);
lean_inc(v_tail_1201_);
lean_dec_ref_known(v_x_1199_, 2);
v_fst_1202_ = lean_ctor_get(v_head_1200_, 0);
lean_inc(v_fst_1202_);
v_snd_1203_ = lean_ctor_get(v_head_1200_, 1);
lean_inc(v_snd_1203_);
lean_dec(v_head_1200_);
v___x_1204_ = lean_unsigned_to_nat(1u);
v___x_1205_ = lp_algalVerification_Algal_Expr_stringBytes(v_fst_1202_);
v___x_1206_ = lean_nat_add(v_x_1198_, v___x_1205_);
lean_dec(v___x_1205_);
lean_dec(v_x_1198_);
v___x_1207_ = lean_nat_add(v___x_1206_, v___x_1204_);
lean_dec(v___x_1206_);
v___x_1208_ = lp_algalVerification_Algal_Expr_valueByteCount(v_snd_1203_);
v___x_1209_ = lean_nat_add(v___x_1207_, v___x_1208_);
lean_dec(v___x_1208_);
lean_dec(v___x_1207_);
v_x_1198_ = v___x_1209_;
v_x_1199_ = v_tail_1201_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envBytes(lean_object* v_env_1211_){
_start:
{
lean_object* v___x_1212_; lean_object* v___x_1213_; lean_object* v___x_1214_; lean_object* v___x_1215_; lean_object* v___x_1216_; lean_object* v___x_1217_; lean_object* v___x_1218_; lean_object* v___x_1219_; 
v___x_1212_ = lean_unsigned_to_nat(2u);
v___x_1213_ = l_List_lengthTR___redArg(v_env_1211_);
v___x_1214_ = lean_unsigned_to_nat(1u);
v___x_1215_ = lean_nat_sub(v___x_1213_, v___x_1214_);
lean_dec(v___x_1213_);
v___x_1216_ = lean_nat_add(v___x_1212_, v___x_1215_);
lean_dec(v___x_1215_);
v___x_1217_ = lean_unsigned_to_nat(0u);
v___x_1218_ = lp_algalVerification_List_foldl___at___00Algal_Expr_envBytes_spec__0(v___x_1217_, v_env_1211_);
v___x_1219_ = lean_nat_add(v___x_1216_, v___x_1218_);
lean_dec(v___x_1218_);
lean_dec(v___x_1216_);
return v___x_1219_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0(lean_object* v_x_1220_, lean_object* v_x_1221_){
_start:
{
if (lean_obj_tag(v_x_1221_) == 0)
{
return v_x_1220_;
}
else
{
lean_object* v_head_1222_; lean_object* v_tail_1223_; lean_object* v_snd_1224_; lean_object* v___x_1225_; uint8_t v___x_1226_; 
v_head_1222_ = lean_ctor_get(v_x_1221_, 0);
v_tail_1223_ = lean_ctor_get(v_x_1221_, 1);
v_snd_1224_ = lean_ctor_get(v_head_1222_, 1);
v___x_1225_ = lp_algalVerification_Algal_Expr_valueDepth(v_snd_1224_);
v___x_1226_ = lean_nat_dec_le(v_x_1220_, v___x_1225_);
if (v___x_1226_ == 0)
{
lean_dec(v___x_1225_);
v_x_1221_ = v_tail_1223_;
goto _start;
}
else
{
lean_dec(v_x_1220_);
v_x_1220_ = v___x_1225_;
v_x_1221_ = v_tail_1223_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0___boxed(lean_object* v_x_1229_, lean_object* v_x_1230_){
_start:
{
lean_object* v_res_1231_; 
v_res_1231_ = lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0(v_x_1229_, v_x_1230_);
lean_dec(v_x_1230_);
return v_res_1231_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envDepth(lean_object* v_env_1232_){
_start:
{
lean_object* v___x_1233_; lean_object* v___x_1234_; lean_object* v___x_1235_; lean_object* v___x_1236_; 
v___x_1233_ = lean_unsigned_to_nat(1u);
v___x_1234_ = lean_unsigned_to_nat(0u);
v___x_1235_ = lp_algalVerification_List_foldl___at___00Algal_Expr_envDepth_spec__0(v___x_1234_, v_env_1232_);
v___x_1236_ = lean_nat_add(v___x_1233_, v___x_1235_);
lean_dec(v___x_1235_);
return v___x_1236_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_envDepth___boxed(lean_object* v_env_1237_){
_start:
{
lean_object* v_res_1238_; 
v_res_1238_ = lp_algalVerification_Algal_Expr_envDepth(v_env_1237_);
lean_dec(v_env_1237_);
return v_res_1238_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_numEq(uint64_t v_a_1239_, uint64_t v_b_1240_){
_start:
{
uint64_t v___x_1241_; uint64_t v___x_1242_; uint8_t v___x_1243_; 
v___x_1241_ = lp_algalVerification_Algal_Core_Binary64_normalizeBits(v_a_1239_);
v___x_1242_ = lp_algalVerification_Algal_Core_Binary64_normalizeBits(v_b_1240_);
v___x_1243_ = lean_uint64_dec_eq(v___x_1241_, v___x_1242_);
return v___x_1243_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_numEq___boxed(lean_object* v_a_1244_, lean_object* v_b_1245_){
_start:
{
uint64_t v_a_boxed_1246_; uint64_t v_b_boxed_1247_; uint8_t v_res_1248_; lean_object* v_r_1249_; 
v_a_boxed_1246_ = lean_unbox_uint64(v_a_1244_);
lean_dec_ref(v_a_1244_);
v_b_boxed_1247_ = lean_unbox_uint64(v_b_1245_);
lean_dec_ref(v_b_1245_);
v_res_1248_ = lp_algalVerification_Algal_Expr_numEq(v_a_boxed_1246_, v_b_boxed_1247_);
v_r_1249_ = lean_box(v_res_1248_);
return v_r_1249_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_eqv(lean_object* v_a_1250_, lean_object* v_b_1251_){
_start:
{
lean_object* v___x_1252_; lean_object* v___x_1253_; uint8_t v___x_1254_; 
v___x_1252_ = lp_algalVerification_Algal_Core_Normalize_normalize(v_a_1250_);
v___x_1253_ = lp_algalVerification_Algal_Core_Normalize_normalize(v_b_1251_);
v___x_1254_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v___x_1252_, v___x_1253_);
lean_dec(v___x_1253_);
lean_dec(v___x_1252_);
return v___x_1254_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_eqv___boxed(lean_object* v_a_1255_, lean_object* v_b_1256_){
_start:
{
uint8_t v_res_1257_; lean_object* v_r_1258_; 
v_res_1257_ = lp_algalVerification_Algal_Expr_eqv(v_a_1255_, v_b_1256_);
v_r_1258_ = lean_box(v_res_1257_);
return v_r_1258_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_utf16compare(lean_object* v_a_1259_, lean_object* v_b_1260_){
_start:
{
lean_object* v___x_1261_; lean_object* v___x_1262_; uint8_t v___x_1263_; 
v___x_1261_ = lp_algalVerification_Algal_Core_Text_utf16(v_a_1259_);
v___x_1262_ = lp_algalVerification_Algal_Core_Text_utf16(v_b_1260_);
v___x_1263_ = lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(v___x_1261_, v___x_1262_);
lean_dec(v___x_1262_);
lean_dec(v___x_1261_);
return v___x_1263_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_utf16compare___boxed(lean_object* v_a_1264_, lean_object* v_b_1265_){
_start:
{
uint8_t v_res_1266_; lean_object* v_r_1267_; 
v_res_1266_ = lp_algalVerification_Algal_Expr_utf16compare(v_a_1264_, v_b_1265_);
v_r_1267_ = lean_box(v_res_1266_);
return v_r_1267_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_isTrimChar(uint32_t v_c_1268_){
_start:
{
lean_object* v___x_1269_; lean_object* v___x_1270_; uint8_t v___x_1271_; 
v___x_1269_ = lean_uint32_to_nat(v_c_1268_);
v___x_1270_ = lean_unsigned_to_nat(32u);
v___x_1271_ = lean_nat_dec_eq(v___x_1269_, v___x_1270_);
if (v___x_1271_ == 0)
{
lean_object* v___x_1272_; uint8_t v___x_1273_; 
v___x_1272_ = lean_unsigned_to_nat(9u);
v___x_1273_ = lean_nat_dec_eq(v___x_1269_, v___x_1272_);
if (v___x_1273_ == 0)
{
lean_object* v___x_1274_; uint8_t v___x_1275_; 
v___x_1274_ = lean_unsigned_to_nat(10u);
v___x_1275_ = lean_nat_dec_eq(v___x_1269_, v___x_1274_);
if (v___x_1275_ == 0)
{
lean_object* v___x_1276_; uint8_t v___x_1277_; 
v___x_1276_ = lean_unsigned_to_nat(13u);
v___x_1277_ = lean_nat_dec_eq(v___x_1269_, v___x_1276_);
if (v___x_1277_ == 0)
{
lean_object* v___x_1278_; uint8_t v___x_1279_; 
v___x_1278_ = lean_unsigned_to_nat(11u);
v___x_1279_ = lean_nat_dec_eq(v___x_1269_, v___x_1278_);
if (v___x_1279_ == 0)
{
lean_object* v___x_1280_; uint8_t v___x_1281_; 
v___x_1280_ = lean_unsigned_to_nat(12u);
v___x_1281_ = lean_nat_dec_eq(v___x_1269_, v___x_1280_);
lean_dec(v___x_1269_);
return v___x_1281_;
}
else
{
lean_dec(v___x_1269_);
return v___x_1279_;
}
}
else
{
lean_dec(v___x_1269_);
return v___x_1277_;
}
}
else
{
lean_dec(v___x_1269_);
return v___x_1275_;
}
}
else
{
lean_dec(v___x_1269_);
return v___x_1273_;
}
}
else
{
lean_dec(v___x_1269_);
return v___x_1271_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_isTrimChar___boxed(lean_object* v_c_1282_){
_start:
{
uint32_t v_c_boxed_1283_; uint8_t v_res_1284_; lean_object* v_r_1285_; 
v_c_boxed_1283_ = lean_unbox_uint32(v_c_1282_);
lean_dec(v_c_1282_);
v_res_1284_ = lp_algalVerification_Algal_Expr_isTrimChar(v_c_boxed_1283_);
v_r_1285_ = lean_box(v_res_1284_);
return v_r_1285_;
}
}
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Expr_asciiUpperChar(uint32_t v_c_1286_){
_start:
{
lean_object* v___x_1287_; lean_object* v___x_1288_; uint8_t v___x_1289_; 
v___x_1287_ = lean_unsigned_to_nat(97u);
v___x_1288_ = lean_uint32_to_nat(v_c_1286_);
v___x_1289_ = lean_nat_dec_le(v___x_1287_, v___x_1288_);
if (v___x_1289_ == 0)
{
lean_dec(v___x_1288_);
return v_c_1286_;
}
else
{
lean_object* v___x_1290_; uint8_t v___x_1291_; 
v___x_1290_ = lean_unsigned_to_nat(122u);
v___x_1291_ = lean_nat_dec_le(v___x_1288_, v___x_1290_);
if (v___x_1291_ == 0)
{
lean_dec(v___x_1288_);
return v_c_1286_;
}
else
{
lean_object* v___x_1292_; lean_object* v___x_1293_; uint32_t v___x_1294_; 
v___x_1292_ = lean_unsigned_to_nat(32u);
v___x_1293_ = lean_nat_sub(v___x_1288_, v___x_1292_);
lean_dec(v___x_1288_);
v___x_1294_ = l_Char_ofNat(v___x_1293_);
lean_dec(v___x_1293_);
return v___x_1294_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asciiUpperChar___boxed(lean_object* v_c_1295_){
_start:
{
uint32_t v_c_boxed_1296_; uint32_t v_res_1297_; lean_object* v_r_1298_; 
v_c_boxed_1296_ = lean_unbox_uint32(v_c_1295_);
lean_dec(v_c_1295_);
v_res_1297_ = lp_algalVerification_Algal_Expr_asciiUpperChar(v_c_boxed_1296_);
v_r_1298_ = lean_box_uint32(v_res_1297_);
return v_r_1298_;
}
}
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Expr_asciiLowerChar(uint32_t v_c_1299_){
_start:
{
lean_object* v___x_1300_; lean_object* v___x_1301_; uint8_t v___x_1302_; 
v___x_1300_ = lean_unsigned_to_nat(65u);
v___x_1301_ = lean_uint32_to_nat(v_c_1299_);
v___x_1302_ = lean_nat_dec_le(v___x_1300_, v___x_1301_);
if (v___x_1302_ == 0)
{
lean_dec(v___x_1301_);
return v_c_1299_;
}
else
{
lean_object* v___x_1303_; uint8_t v___x_1304_; 
v___x_1303_ = lean_unsigned_to_nat(90u);
v___x_1304_ = lean_nat_dec_le(v___x_1301_, v___x_1303_);
if (v___x_1304_ == 0)
{
lean_dec(v___x_1301_);
return v_c_1299_;
}
else
{
lean_object* v___x_1305_; lean_object* v___x_1306_; uint32_t v___x_1307_; 
v___x_1305_ = lean_unsigned_to_nat(32u);
v___x_1306_ = lean_nat_add(v___x_1301_, v___x_1305_);
lean_dec(v___x_1301_);
v___x_1307_ = l_Char_ofNat(v___x_1306_);
lean_dec(v___x_1306_);
return v___x_1307_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_asciiLowerChar___boxed(lean_object* v_c_1308_){
_start:
{
uint32_t v_c_boxed_1309_; uint32_t v_res_1310_; lean_object* v_r_1311_; 
v_c_boxed_1309_ = lean_unbox_uint32(v_c_1308_);
lean_dec(v_c_1308_);
v_res_1310_ = lp_algalVerification_Algal_Expr_asciiLowerChar(v_c_boxed_1309_);
v_r_1311_ = lean_box_uint32(v_res_1310_);
return v_r_1311_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_upperStr_spec__0(lean_object* v_a_1312_, lean_object* v_a_1313_){
_start:
{
if (lean_obj_tag(v_a_1312_) == 0)
{
lean_object* v___x_1314_; 
v___x_1314_ = l_List_reverse___redArg(v_a_1313_);
return v___x_1314_;
}
else
{
lean_object* v_head_1315_; lean_object* v_tail_1316_; lean_object* v___x_1318_; uint8_t v_isShared_1319_; uint8_t v_isSharedCheck_1327_; 
v_head_1315_ = lean_ctor_get(v_a_1312_, 0);
v_tail_1316_ = lean_ctor_get(v_a_1312_, 1);
v_isSharedCheck_1327_ = !lean_is_exclusive(v_a_1312_);
if (v_isSharedCheck_1327_ == 0)
{
v___x_1318_ = v_a_1312_;
v_isShared_1319_ = v_isSharedCheck_1327_;
goto v_resetjp_1317_;
}
else
{
lean_inc(v_tail_1316_);
lean_inc(v_head_1315_);
lean_dec(v_a_1312_);
v___x_1318_ = lean_box(0);
v_isShared_1319_ = v_isSharedCheck_1327_;
goto v_resetjp_1317_;
}
v_resetjp_1317_:
{
uint32_t v___x_1320_; uint32_t v___x_1321_; lean_object* v___x_1322_; lean_object* v___x_1324_; 
v___x_1320_ = lean_unbox_uint32(v_head_1315_);
lean_dec(v_head_1315_);
v___x_1321_ = lp_algalVerification_Algal_Expr_asciiUpperChar(v___x_1320_);
v___x_1322_ = lean_box_uint32(v___x_1321_);
if (v_isShared_1319_ == 0)
{
lean_ctor_set(v___x_1318_, 1, v_a_1313_);
lean_ctor_set(v___x_1318_, 0, v___x_1322_);
v___x_1324_ = v___x_1318_;
goto v_reusejp_1323_;
}
else
{
lean_object* v_reuseFailAlloc_1326_; 
v_reuseFailAlloc_1326_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1326_, 0, v___x_1322_);
lean_ctor_set(v_reuseFailAlloc_1326_, 1, v_a_1313_);
v___x_1324_ = v_reuseFailAlloc_1326_;
goto v_reusejp_1323_;
}
v_reusejp_1323_:
{
v_a_1312_ = v_tail_1316_;
v_a_1313_ = v___x_1324_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_upperStr(lean_object* v_s_1328_){
_start:
{
lean_object* v___x_1329_; lean_object* v___x_1330_; lean_object* v___x_1331_; lean_object* v___x_1332_; 
v___x_1329_ = lean_string_data(v_s_1328_);
v___x_1330_ = lean_box(0);
v___x_1331_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_upperStr_spec__0(v___x_1329_, v___x_1330_);
v___x_1332_ = lean_string_mk(v___x_1331_);
return v___x_1332_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_lowerStr_spec__0(lean_object* v_a_1333_, lean_object* v_a_1334_){
_start:
{
if (lean_obj_tag(v_a_1333_) == 0)
{
lean_object* v___x_1335_; 
v___x_1335_ = l_List_reverse___redArg(v_a_1334_);
return v___x_1335_;
}
else
{
lean_object* v_head_1336_; lean_object* v_tail_1337_; lean_object* v___x_1339_; uint8_t v_isShared_1340_; uint8_t v_isSharedCheck_1348_; 
v_head_1336_ = lean_ctor_get(v_a_1333_, 0);
v_tail_1337_ = lean_ctor_get(v_a_1333_, 1);
v_isSharedCheck_1348_ = !lean_is_exclusive(v_a_1333_);
if (v_isSharedCheck_1348_ == 0)
{
v___x_1339_ = v_a_1333_;
v_isShared_1340_ = v_isSharedCheck_1348_;
goto v_resetjp_1338_;
}
else
{
lean_inc(v_tail_1337_);
lean_inc(v_head_1336_);
lean_dec(v_a_1333_);
v___x_1339_ = lean_box(0);
v_isShared_1340_ = v_isSharedCheck_1348_;
goto v_resetjp_1338_;
}
v_resetjp_1338_:
{
uint32_t v___x_1341_; uint32_t v___x_1342_; lean_object* v___x_1343_; lean_object* v___x_1345_; 
v___x_1341_ = lean_unbox_uint32(v_head_1336_);
lean_dec(v_head_1336_);
v___x_1342_ = lp_algalVerification_Algal_Expr_asciiLowerChar(v___x_1341_);
v___x_1343_ = lean_box_uint32(v___x_1342_);
if (v_isShared_1340_ == 0)
{
lean_ctor_set(v___x_1339_, 1, v_a_1334_);
lean_ctor_set(v___x_1339_, 0, v___x_1343_);
v___x_1345_ = v___x_1339_;
goto v_reusejp_1344_;
}
else
{
lean_object* v_reuseFailAlloc_1347_; 
v_reuseFailAlloc_1347_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1347_, 0, v___x_1343_);
lean_ctor_set(v_reuseFailAlloc_1347_, 1, v_a_1334_);
v___x_1345_ = v_reuseFailAlloc_1347_;
goto v_reusejp_1344_;
}
v_reusejp_1344_:
{
v_a_1333_ = v_tail_1337_;
v_a_1334_ = v___x_1345_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_lowerStr(lean_object* v_s_1349_){
_start:
{
lean_object* v___x_1350_; lean_object* v___x_1351_; lean_object* v___x_1352_; lean_object* v___x_1353_; 
v___x_1350_ = lean_string_data(v_s_1349_);
v___x_1351_ = lean_box(0);
v___x_1352_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Expr_lowerStr_spec__0(v___x_1350_, v___x_1351_);
v___x_1353_ = lean_string_mk(v___x_1352_);
return v___x_1353_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0(lean_object* v_x_1354_){
_start:
{
if (lean_obj_tag(v_x_1354_) == 0)
{
return v_x_1354_;
}
else
{
lean_object* v_head_1355_; lean_object* v_tail_1356_; uint32_t v___x_1357_; uint8_t v___x_1358_; 
v_head_1355_ = lean_ctor_get(v_x_1354_, 0);
v_tail_1356_ = lean_ctor_get(v_x_1354_, 1);
v___x_1357_ = lean_unbox_uint32(v_head_1355_);
v___x_1358_ = lp_algalVerification_Algal_Expr_isTrimChar(v___x_1357_);
if (v___x_1358_ == 0)
{
lean_inc_ref(v_x_1354_);
return v_x_1354_;
}
else
{
v_x_1354_ = v_tail_1356_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0___boxed(lean_object* v_x_1360_){
_start:
{
lean_object* v_res_1361_; 
v_res_1361_ = lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0(v_x_1360_);
lean_dec(v_x_1360_);
return v_res_1361_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_trimStr(lean_object* v_s_1362_){
_start:
{
lean_object* v___x_1363_; lean_object* v___x_1364_; lean_object* v___x_1365_; lean_object* v___x_1366_; lean_object* v___x_1367_; lean_object* v___x_1368_; 
v___x_1363_ = lean_string_data(v_s_1362_);
v___x_1364_ = lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0(v___x_1363_);
lean_dec(v___x_1363_);
v___x_1365_ = l_List_reverse___redArg(v___x_1364_);
v___x_1366_ = lp_algalVerification_List_dropWhile___at___00Algal_Expr_trimStr_spec__0(v___x_1365_);
lean_dec(v___x_1365_);
v___x_1367_ = l_List_reverse___redArg(v___x_1366_);
v___x_1368_ = lean_string_mk(v___x_1367_);
return v___x_1368_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(lean_object* v_x_1369_, lean_object* v_x_1370_){
_start:
{
if (lean_obj_tag(v_x_1369_) == 0)
{
uint8_t v___x_1371_; 
v___x_1371_ = 1;
return v___x_1371_;
}
else
{
if (lean_obj_tag(v_x_1370_) == 0)
{
uint8_t v___x_1372_; 
v___x_1372_ = 0;
return v___x_1372_;
}
else
{
lean_object* v_head_1373_; lean_object* v_tail_1374_; lean_object* v_head_1375_; lean_object* v_tail_1376_; uint32_t v___x_1377_; uint32_t v___x_1378_; uint8_t v___x_1379_; 
v_head_1373_ = lean_ctor_get(v_x_1369_, 0);
v_tail_1374_ = lean_ctor_get(v_x_1369_, 1);
v_head_1375_ = lean_ctor_get(v_x_1370_, 0);
v_tail_1376_ = lean_ctor_get(v_x_1370_, 1);
v___x_1377_ = lean_unbox_uint32(v_head_1373_);
v___x_1378_ = lean_unbox_uint32(v_head_1375_);
v___x_1379_ = lean_uint32_dec_eq(v___x_1377_, v___x_1378_);
if (v___x_1379_ == 0)
{
return v___x_1379_;
}
else
{
v_x_1369_ = v_tail_1374_;
v_x_1370_ = v_tail_1376_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0___boxed(lean_object* v_x_1381_, lean_object* v_x_1382_){
_start:
{
uint8_t v_res_1383_; lean_object* v_r_1384_; 
v_res_1383_ = lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(v_x_1381_, v_x_1382_);
lean_dec(v_x_1382_);
lean_dec(v_x_1381_);
v_r_1384_ = lean_box(v_res_1383_);
return v_r_1384_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Expr_charInfix(lean_object* v_hay_1385_, lean_object* v_needle_1386_){
_start:
{
uint8_t v___x_1387_; 
v___x_1387_ = lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(v_needle_1386_, v_hay_1385_);
if (v___x_1387_ == 0)
{
if (lean_obj_tag(v_hay_1385_) == 0)
{
uint8_t v___x_1388_; 
v___x_1388_ = l_List_isEmpty___redArg(v_needle_1386_);
return v___x_1388_;
}
else
{
lean_object* v_tail_1389_; 
v_tail_1389_ = lean_ctor_get(v_hay_1385_, 1);
v_hay_1385_ = v_tail_1389_;
goto _start;
}
}
else
{
return v___x_1387_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_charInfix___boxed(lean_object* v_hay_1391_, lean_object* v_needle_1392_){
_start:
{
uint8_t v_res_1393_; lean_object* v_r_1394_; 
v_res_1393_ = lp_algalVerification_Algal_Expr_charInfix(v_hay_1391_, v_needle_1392_);
lean_dec(v_needle_1392_);
lean_dec(v_hay_1391_);
v_r_1394_ = lean_box(v_res_1393_);
return v_r_1394_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___redArg(lean_object* v_sep_1395_, lean_object* v_rem_1396_, lean_object* v_cur_1397_){
_start:
{
uint8_t v___x_1398_; 
v___x_1398_ = lp_algalVerification_List_isPrefixOf___at___00Algal_Expr_charInfix_spec__0(v_sep_1395_, v_rem_1396_);
if (v___x_1398_ == 0)
{
if (lean_obj_tag(v_rem_1396_) == 0)
{
lean_object* v___x_1399_; lean_object* v___x_1400_; 
v___x_1399_ = lean_box(0);
v___x_1400_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1400_, 0, v_cur_1397_);
lean_ctor_set(v___x_1400_, 1, v___x_1399_);
return v___x_1400_;
}
else
{
lean_object* v_head_1401_; lean_object* v_tail_1402_; lean_object* v___x_1404_; uint8_t v_isShared_1405_; uint8_t v_isSharedCheck_1412_; 
v_head_1401_ = lean_ctor_get(v_rem_1396_, 0);
v_tail_1402_ = lean_ctor_get(v_rem_1396_, 1);
v_isSharedCheck_1412_ = !lean_is_exclusive(v_rem_1396_);
if (v_isSharedCheck_1412_ == 0)
{
v___x_1404_ = v_rem_1396_;
v_isShared_1405_ = v_isSharedCheck_1412_;
goto v_resetjp_1403_;
}
else
{
lean_inc(v_tail_1402_);
lean_inc(v_head_1401_);
lean_dec(v_rem_1396_);
v___x_1404_ = lean_box(0);
v_isShared_1405_ = v_isSharedCheck_1412_;
goto v_resetjp_1403_;
}
v_resetjp_1403_:
{
lean_object* v___x_1406_; lean_object* v___x_1408_; 
v___x_1406_ = lean_box(0);
if (v_isShared_1405_ == 0)
{
lean_ctor_set(v___x_1404_, 1, v___x_1406_);
v___x_1408_ = v___x_1404_;
goto v_reusejp_1407_;
}
else
{
lean_object* v_reuseFailAlloc_1411_; 
v_reuseFailAlloc_1411_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1411_, 0, v_head_1401_);
lean_ctor_set(v_reuseFailAlloc_1411_, 1, v___x_1406_);
v___x_1408_ = v_reuseFailAlloc_1411_;
goto v_reusejp_1407_;
}
v_reusejp_1407_:
{
lean_object* v___x_1409_; 
v___x_1409_ = l_List_appendTR___redArg(v_cur_1397_, v___x_1408_);
v_rem_1396_ = v_tail_1402_;
v_cur_1397_ = v___x_1409_;
goto _start;
}
}
}
}
else
{
lean_object* v___x_1413_; lean_object* v___x_1414_; lean_object* v___x_1415_; lean_object* v___x_1416_; lean_object* v___x_1417_; 
v___x_1413_ = l_List_lengthTR___redArg(v_sep_1395_);
v___x_1414_ = l_List_drop___redArg(v___x_1413_, v_rem_1396_);
lean_dec(v_rem_1396_);
v___x_1415_ = lean_box(0);
v___x_1416_ = lp_algalVerification_Algal_Expr_splitGo___redArg(v_sep_1395_, v___x_1414_, v___x_1415_);
v___x_1417_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_1417_, 0, v_cur_1397_);
lean_ctor_set(v___x_1417_, 1, v___x_1416_);
return v___x_1417_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___redArg___boxed(lean_object* v_sep_1418_, lean_object* v_rem_1419_, lean_object* v_cur_1420_){
_start:
{
lean_object* v_res_1421_; 
v_res_1421_ = lp_algalVerification_Algal_Expr_splitGo___redArg(v_sep_1418_, v_rem_1419_, v_cur_1420_);
lean_dec(v_sep_1418_);
return v_res_1421_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo(lean_object* v_sep_1422_, lean_object* v_hne_1423_, lean_object* v_rem_1424_, lean_object* v_cur_1425_){
_start:
{
lean_object* v___x_1426_; 
v___x_1426_ = lp_algalVerification_Algal_Expr_splitGo___redArg(v_sep_1422_, v_rem_1424_, v_cur_1425_);
return v___x_1426_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitGo___boxed(lean_object* v_sep_1427_, lean_object* v_hne_1428_, lean_object* v_rem_1429_, lean_object* v_cur_1430_){
_start:
{
lean_object* v_res_1431_; 
v_res_1431_ = lp_algalVerification_Algal_Expr_splitGo(v_sep_1427_, v_hne_1428_, v_rem_1429_, v_cur_1430_);
lean_dec(v_sep_1427_);
return v_res_1431_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter___redArg(lean_object* v_rem_1432_, lean_object* v_h__1_1433_, lean_object* v_h__2_1434_){
_start:
{
if (lean_obj_tag(v_rem_1432_) == 0)
{
lean_object* v___x_1435_; 
lean_dec(v_h__2_1434_);
v___x_1435_ = lean_apply_1(v_h__1_1433_, lean_box(0));
return v___x_1435_;
}
else
{
lean_object* v_head_1436_; lean_object* v_tail_1437_; lean_object* v___x_1438_; 
lean_dec(v_h__1_1433_);
v_head_1436_ = lean_ctor_get(v_rem_1432_, 0);
lean_inc(v_head_1436_);
v_tail_1437_ = lean_ctor_get(v_rem_1432_, 1);
lean_inc(v_tail_1437_);
lean_dec_ref_known(v_rem_1432_, 2);
v___x_1438_ = lean_apply_3(v_h__2_1434_, v_head_1436_, v_tail_1437_, lean_box(0));
return v___x_1438_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter(lean_object* v_sep_1439_, lean_object* v_motive_1440_, lean_object* v_rem_1441_, lean_object* v_h_1442_, lean_object* v_h__1_1443_, lean_object* v_h__2_1444_){
_start:
{
if (lean_obj_tag(v_rem_1441_) == 0)
{
lean_object* v___x_1445_; 
lean_dec(v_h__2_1444_);
v___x_1445_ = lean_apply_1(v_h__1_1443_, lean_box(0));
return v___x_1445_;
}
else
{
lean_object* v_head_1446_; lean_object* v_tail_1447_; lean_object* v___x_1448_; 
lean_dec(v_h__1_1443_);
v_head_1446_ = lean_ctor_get(v_rem_1441_, 0);
lean_inc(v_head_1446_);
v_tail_1447_ = lean_ctor_get(v_rem_1441_, 1);
lean_inc(v_tail_1447_);
lean_dec_ref_known(v_rem_1441_, 2);
v___x_1448_ = lean_apply_3(v_h__2_1444_, v_head_1446_, v_tail_1447_, lean_box(0));
return v___x_1448_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter___boxed(lean_object* v_sep_1449_, lean_object* v_motive_1450_, lean_object* v_rem_1451_, lean_object* v_h_1452_, lean_object* v_h__1_1453_, lean_object* v_h__2_1454_){
_start:
{
lean_object* v_res_1455_; 
v_res_1455_ = lp_algalVerification___private_Algal_Expr_Model_0__Algal_Expr_splitGo_match__1_splitter(v_sep_1449_, v_motive_1450_, v_rem_1451_, v_h_1452_, v_h__1_1453_, v_h__2_1454_);
lean_dec(v_sep_1449_);
return v_res_1455_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___redArg(lean_object* v_s_1456_, lean_object* v_sep_1457_){
_start:
{
lean_object* v___x_1458_; lean_object* v___x_1459_; 
v___x_1458_ = lean_box(0);
v___x_1459_ = lp_algalVerification_Algal_Expr_splitGo___redArg(v_sep_1457_, v_s_1456_, v___x_1458_);
return v___x_1459_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___redArg___boxed(lean_object* v_s_1460_, lean_object* v_sep_1461_){
_start:
{
lean_object* v_res_1462_; 
v_res_1462_ = lp_algalVerification_Algal_Expr_splitChars___redArg(v_s_1460_, v_sep_1461_);
lean_dec(v_sep_1461_);
return v_res_1462_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars(lean_object* v_s_1463_, lean_object* v_sep_1464_, lean_object* v_hne_1465_){
_start:
{
lean_object* v___x_1466_; 
v___x_1466_ = lp_algalVerification_Algal_Expr_splitChars___redArg(v_s_1463_, v_sep_1464_);
return v___x_1466_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Expr_splitChars___boxed(lean_object* v_s_1467_, lean_object* v_sep_1468_, lean_object* v_hne_1469_){
_start:
{
lean_object* v_res_1470_; 
v_res_1470_ = lp_algalVerification_Algal_Expr_splitChars(v_s_1467_, v_sep_1468_, v_hne_1469_);
lean_dec(v_sep_1468_);
return v_res_1470_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_JsonString(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_KeyOrder(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Normalize(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_NumericInjectivity(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Text(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Expr_Model(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Json(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_JsonString(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_KeyOrder(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Normalize(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_NumericInjectivity(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_OwnMap(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Text(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Expr_zeroNumber = _init_lp_algalVerification_Algal_Expr_zeroNumber();
lp_algalVerification_Algal_Expr_maxProgramBytes = _init_lp_algalVerification_Algal_Expr_maxProgramBytes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxProgramBytes);
lp_algalVerification_Algal_Expr_maxProgramNodes = _init_lp_algalVerification_Algal_Expr_maxProgramNodes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxProgramNodes);
lp_algalVerification_Algal_Expr_maxProgramDepth = _init_lp_algalVerification_Algal_Expr_maxProgramDepth();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxProgramDepth);
lp_algalVerification_Algal_Expr_maxEnvBytes = _init_lp_algalVerification_Algal_Expr_maxEnvBytes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxEnvBytes);
lp_algalVerification_Algal_Expr_maxValueDepth = _init_lp_algalVerification_Algal_Expr_maxValueDepth();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxValueDepth);
lp_algalVerification_Algal_Expr_maxListLen = _init_lp_algalVerification_Algal_Expr_maxListLen();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxListLen);
lp_algalVerification_Algal_Expr_maxObjectKeys = _init_lp_algalVerification_Algal_Expr_maxObjectKeys();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxObjectKeys);
lp_algalVerification_Algal_Expr_maxStringBytes = _init_lp_algalVerification_Algal_Expr_maxStringBytes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxStringBytes);
lp_algalVerification_Algal_Expr_maxOutputBytes = _init_lp_algalVerification_Algal_Expr_maxOutputBytes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxOutputBytes);
lp_algalVerification_Algal_Expr_maxValueBytes = _init_lp_algalVerification_Algal_Expr_maxValueBytes();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxValueBytes);
lp_algalVerification_Algal_Expr_maxVarLen = _init_lp_algalVerification_Algal_Expr_maxVarLen();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxVarLen);
lp_algalVerification_Algal_Expr_maxFuel = _init_lp_algalVerification_Algal_Expr_maxFuel();
lean_mark_persistent(lp_algalVerification_Algal_Expr_maxFuel);
lp_algalVerification_Algal_Expr_numberByteBound = _init_lp_algalVerification_Algal_Expr_numberByteBound();
lean_mark_persistent(lp_algalVerification_Algal_Expr_numberByteBound);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
